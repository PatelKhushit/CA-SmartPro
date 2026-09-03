import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import { DocumentRequestsService } from '../document-requests/document-requests.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type {
  CreateFilingDocumentRequestDto,
  CreateFilingReminderDto,
  CreateFilingTaskDto,
  CreateRocFilingDto,
  ListRocFilingsDto,
  UpdateRocFilingDto,
} from './dto/roc-filing.dto.js';

const FILING_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true, cinOrLlpin: true } },
  assignedUser: { select: { id: true, fullName: true } },
} satisfies Prisma.ROCFilingInclude;

@Injectable()
export class RocService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentRequests: DocumentRequestsService,
    private readonly audit: AuditService,
  ) {}

  async summary(organizationId: string) {
    const [totalClients, statusCounts, pendingDocs] = await Promise.all([
      this.prisma.client.count({ where: { organizationId, deletedAt: null, cinOrLlpin: { not: null } } }),
      this.prisma.rOCFiling.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.documentRequestItem.count({
        where: {
          organizationId,
          status: 'PENDING',
          documentRequest: { client: { rocFilings: { some: { organizationId } } } },
        },
      }),
    ]);
    const counts = Object.fromEntries(statusCounts.map((r) => [r.status, r._count]));
    return {
      totalClients,
      returnsDue: (counts.UPCOMING ?? 0) + (counts.DUE_TODAY ?? 0),
      returnsCompleted: counts.COMPLETED ?? 0,
      overdue: counts.OVERDUE ?? 0,
      pendingDocuments: pendingDocs,
    };
  }

  async list(organizationId: string, query: ListRocFilingsDto) {
    const where: Prisma.ROCFilingWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
              { client: { cinOrLlpin: { contains: query.search, mode: 'insensitive' } } },
              { srn: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.rOCFiling.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: FILING_INCLUDE,
      }),
      this.prisma.rOCFiling.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwned(organizationId: string, id: string) {
    const filing = await this.prisma.rOCFiling.findFirst({ where: { id, organizationId }, include: FILING_INCLUDE });
    if (!filing) throw new NotFoundApiError('ROC_FILING_NOT_FOUND', 'This ROC filing could not be found.');
    return filing;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateRocFilingDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const filing = await tx.rOCFiling.create({
          data: {
            organizationId: user.organizationId,
            clientId: dto.clientId,
            formType: dto.formType,
            financialYear: dto.financialYear,
            dueDate: new Date(dto.dueDate),
            assignedUserId: dto.assignedUserId,
            notes: dto.notes,
            createdByUserId: user.id,
          },
        });
        await this.audit.log(
          {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'roc_filing_created',
            entityType: 'roc_filing',
            entityId: filing.id,
            after: filing,
            metadata: { financialYear: filing.financialYear, formType: filing.formType },
          },
          tx,
        );
        return filing;
      });
      return this.findOwned(user.organizationId, created.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('ROC_FILING_EXISTS', 'A filing of this type already exists for this financial year.');
      }
      throw err;
    }
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRocFilingDto) {
    const existing = await this.findOwned(user.organizationId, id);
    const completing = dto.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.rOCFiling.update({
        where: { id },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
          filingDate: dto.filingDate ? new Date(dto.filingDate) : undefined,
          srn: dto.srn,
          assignedUserId: dto.assignedUserId,
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
          action: 'roc_filing_updated',
          entityType: 'roc_filing',
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

  async createTaskForFiling(user: AuthenticatedUser, id: string, dto: CreateFilingTaskDto) {
    const filing = await this.findOwned(user.organizationId, id);
    if (filing.taskId) throw new ConflictApiError('TASK_ALREADY_LINKED', 'A task is already linked to this filing.');

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        clientId: filing.clientId,
        title: dto.title ?? `${filing.formType} — ${filing.client.cinOrLlpin ?? filing.client.displayName} (${filing.financialYear})`,
        category: 'COMPLIANCE',
        dueDate: filing.dueDate,
        assignedUserId: dto.assignedUserId ?? filing.assignedUserId,
        createdByUserId: user.id,
      },
    });
    await this.prisma.rOCFiling.update({ where: { id }, data: { taskId: task.id } });
    return this.findOwned(user.organizationId, id);
  }

  async createReminderForFiling(user: AuthenticatedUser, id: string, dto: CreateFilingReminderDto) {
    const filing = await this.findOwned(user.organizationId, id);
    await this.prisma.reminder.create({
      data: {
        organizationId: user.organizationId,
        entityType: 'ROC_FILING',
        entityId: id,
        userId: filing.assignedUserId ?? user.id,
        offsetLabel: 'CUSTOM',
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
    return { message: 'Reminder created.' };
  }

  async requestDocumentsForFiling(user: AuthenticatedUser, id: string, dto: CreateFilingDocumentRequestDto) {
    const filing = await this.findOwned(user.organizationId, id);
    return this.documentRequests.create(user, {
      clientId: filing.clientId,
      title: dto.title ?? `${filing.formType} documents — FY ${filing.financialYear}`,
      items: [
        { label: 'Board resolution', isRequired: true },
        { label: 'Financial statements', isRequired: false },
        { label: 'Digital signature (DSC)', isRequired: false },
        { label: 'Supporting attachments', isRequired: false },
      ],
    });
  }
}
