import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import { DocumentRequestsService } from '../document-requests/document-requests.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type {
  CreateItrReturnDto,
  CreateReturnDocumentRequestDto,
  CreateReturnReminderDto,
  CreateReturnTaskDto,
  ListItrReturnsDto,
  UpdateItrReturnDto,
} from './dto/itr-return.dto.js';

const RETURN_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true, pan: true } },
  assignedUser: { select: { id: true, fullName: true } },
  reviewer: { select: { id: true, fullName: true } },
} satisfies Prisma.ITRReturnInclude;

@Injectable()
export class ItrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentRequests: DocumentRequestsService,
    private readonly audit: AuditService,
  ) {}

  async summary(organizationId: string) {
    const [totalClients, statusCounts, pendingDocs] = await Promise.all([
      this.prisma.client.count({ where: { organizationId, deletedAt: null, pan: { not: null } } }),
      this.prisma.iTRReturn.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.documentRequestItem.count({
        where: {
          organizationId,
          status: 'PENDING',
          documentRequest: { client: { itrReturns: { some: { organizationId } } } },
        },
      }),
    ]);
    const counts = Object.fromEntries(statusCounts.map((r) => [r.status, r._count]));
    return {
      totalClients,
      returnsDue: (counts.DATA_COLLECTION ?? 0) + (counts.PREPARATION ?? 0) + (counts.REVIEW ?? 0) + (counts.CLIENT_APPROVAL ?? 0),
      returnsFiled: (counts.FILED ?? 0) + (counts.VERIFICATION ?? 0) + (counts.COMPLETED ?? 0),
      pendingDocuments: pendingDocs,
    };
  }

  async list(organizationId: string, query: ListItrReturnsDto) {
    const where: Prisma.ITRReturnWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
              { client: { pan: { contains: query.search, mode: 'insensitive' } } },
              { acknowledgementNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.iTRReturn.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: RETURN_INCLUDE,
      }),
      this.prisma.iTRReturn.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwned(organizationId: string, id: string) {
    const ret = await this.prisma.iTRReturn.findFirst({ where: { id, organizationId }, include: RETURN_INCLUDE });
    if (!ret) throw new NotFoundApiError('ITR_RETURN_NOT_FOUND', 'This ITR return could not be found.');
    return ret;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateItrReturnDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const ret = await tx.iTRReturn.create({
          data: {
            organizationId: user.organizationId,
            clientId: dto.clientId,
            assessmentYear: dto.assessmentYear,
            formType: dto.formType,
            dueDate: new Date(dto.dueDate),
            assignedUserId: dto.assignedUserId,
            reviewerUserId: dto.reviewerUserId,
            notes: dto.notes,
            createdByUserId: user.id,
          },
        });
        await this.audit.log(
          {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'itr_return_created',
            entityType: 'itr_return',
            entityId: ret.id,
            after: ret,
            metadata: { assessmentYear: ret.assessmentYear, formType: ret.formType },
          },
          tx,
        );
        return ret;
      });
      return this.findOwned(user.organizationId, created.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('ITR_RETURN_EXISTS', 'A return of this type already exists for this assessment year.');
      }
      throw err;
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateItrReturnDto) {
    const existing = await this.findOwned(user.organizationId, id);
    const completing = dto.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.iTRReturn.update({
        where: { id },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
          acknowledgementNumber: dto.acknowledgementNumber,
          refundAmount: dto.refundAmount,
          demandAmount: dto.demandAmount,
          assignedUserId: dto.assignedUserId,
          reviewerUserId: dto.reviewerUserId,
          notes: dto.notes,
          completedAt: completing ? new Date() : undefined,
        },
      });
      // Keep the linked task in sync — "everything connects" (spec section 25).
      if (completing && existing.taskId) {
        await tx.task.updateMany({
          where: { id: existing.taskId, status: { not: 'COMPLETED' } },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'itr_return_updated',
          entityType: 'itr_return',
          entityId: id,
          before: existing,
          after,
          metadata: dto.status ? { status: dto.status } : undefined,
        },
        tx,
      );
    });

    return this.findOwned(user.organizationId, id);
  }

  async createTaskForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnTaskDto) {
    const ret = await this.findOwned(user.organizationId, id);
    if (ret.taskId) throw new ConflictApiError('TASK_ALREADY_LINKED', 'A task is already linked to this return.');

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        clientId: ret.clientId,
        title: dto.title ?? `${ret.formType} — ${ret.client.pan ?? ret.client.displayName} (${ret.assessmentYear})`,
        category: 'COMPLIANCE',
        dueDate: ret.dueDate,
        assignedUserId: dto.assignedUserId ?? ret.assignedUserId,
        createdByUserId: user.id,
      },
    });
    await this.prisma.iTRReturn.update({ where: { id }, data: { taskId: task.id } });
    return this.findOwned(user.organizationId, id);
  }

  async createReminderForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnReminderDto) {
    const ret = await this.findOwned(user.organizationId, id);
    await this.prisma.reminder.create({
      data: {
        organizationId: user.organizationId,
        entityType: 'ITR_RETURN',
        entityId: id,
        userId: ret.assignedUserId ?? user.id,
        offsetLabel: 'CUSTOM',
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
    return { message: 'Reminder created.' };
  }

  async requestDocumentsForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnDocumentRequestDto) {
    const ret = await this.findOwned(user.organizationId, id);
    return this.documentRequests.create(user, {
      clientId: ret.clientId,
      title: dto.title ?? `${ret.formType} documents — AY ${ret.assessmentYear}`,
      items: [
        { label: 'Form 16', isRequired: true },
        { label: 'Bank statements', isRequired: true },
        { label: 'Investment proofs (80C/80D etc.)', isRequired: false },
        { label: 'AIS / TIS', isRequired: false },
        { label: 'Other income proof', isRequired: false },
      ],
    });
  }
}
