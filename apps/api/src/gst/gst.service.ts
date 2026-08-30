import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import { DocumentRequestsService } from '../document-requests/document-requests.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateGstProfileDto, UpdateGstProfileDto } from './dto/gst-profile.dto.js';
import type {
  CreateGstReturnDto,
  CreateReturnDocumentRequestDto,
  CreateReturnReminderDto,
  CreateReturnTaskDto,
  ListGstReturnsDto,
  UpdateGstReturnDto,
} from './dto/gst-return.dto.js';

const RETURN_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
  gstProfile: { select: { id: true, gstin: true } },
  assignedUser: { select: { id: true, fullName: true } },
} satisfies Prisma.GSTReturnInclude;

@Injectable()
export class GstService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentRequests: DocumentRequestsService,
  ) {}

  // --- Profiles ---

  async listProfiles(organizationId: string, clientId?: string) {
    return this.prisma.gSTProfile.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      include: { client: { select: { id: true, displayName: true, clientCode: true } }, _count: { select: { returns: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProfile(user: AuthenticatedUser, dto: CreateGstProfileDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    try {
      const profile = await this.prisma.$transaction(async (tx) => {
        const created = await tx.gSTProfile.create({
          data: { organizationId: user.organizationId, clientId: dto.clientId, gstin: dto.gstin, tradeName: dto.tradeName, state: dto.state },
        });
        await tx.auditLog.create({
          data: {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'gst_profile_created',
            entityType: 'gst_profile',
            entityId: created.id,
            metadata: { gstin: created.gstin },
          },
        });
        return created;
      });
      return profile;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('GSTIN_IN_USE', 'This GSTIN is already registered for another profile.');
      }
      throw err;
    }
  }

  async updateProfile(user: AuthenticatedUser, id: string, dto: UpdateGstProfileDto) {
    const profile = await this.prisma.gSTProfile.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!profile) throw new NotFoundApiError('GST_PROFILE_NOT_FOUND', 'This GST profile could not be found.');
    return this.prisma.gSTProfile.update({ where: { id }, data: dto });
  }

  // --- Returns ---

  async listReturns(organizationId: string, query: ListGstReturnsDto) {
    const where: Prisma.GSTReturnWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
              { gstProfile: { gstin: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.gSTReturn.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: RETURN_INCLUDE,
      }),
      this.prisma.gSTReturn.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async summary(organizationId: string) {
    const [totalClients, returnCounts, pendingDocs] = await Promise.all([
      this.prisma.gSTProfile.findMany({ where: { organizationId, isActive: true }, distinct: ['clientId'], select: { clientId: true } }),
      this.prisma.gSTReturn.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.documentRequestItem.count({
        where: {
          organizationId,
          status: 'PENDING',
          documentRequest: { client: { gstProfiles: { some: { organizationId, isActive: true } } } },
        },
      }),
    ]);
    const counts = Object.fromEntries(returnCounts.map((r) => [r.status, r._count]));
    return {
      totalClients: totalClients.length,
      returnsDue: (counts.UPCOMING ?? 0) + (counts.DUE_TODAY ?? 0),
      returnsCompleted: counts.COMPLETED ?? 0,
      overdue: counts.OVERDUE ?? 0,
      pendingDocuments: pendingDocs,
    };
  }

  private async findOwnedReturn(organizationId: string, id: string) {
    const ret = await this.prisma.gSTReturn.findFirst({ where: { id, organizationId }, include: RETURN_INCLUDE });
    if (!ret) throw new NotFoundApiError('GST_RETURN_NOT_FOUND', 'This GST return could not be found.');
    return ret;
  }

  async getReturn(organizationId: string, id: string) {
    return this.findOwnedReturn(organizationId, id);
  }

  async createReturn(user: AuthenticatedUser, dto: CreateGstReturnDto) {
    const profile = await this.prisma.gSTProfile.findFirst({ where: { id: dto.gstProfileId, organizationId: user.organizationId } });
    if (!profile) throw new NotFoundApiError('GST_PROFILE_NOT_FOUND', 'This GST profile could not be found.');

    try {
      const created = await this.prisma.gSTReturn.create({
        data: {
          organizationId: user.organizationId,
          gstProfileId: dto.gstProfileId,
          clientId: profile.clientId,
          returnType: dto.returnType,
          taxPeriod: dto.taxPeriod,
          dueDate: new Date(dto.dueDate),
          assignedUserId: dto.assignedUserId,
          notes: dto.notes,
          createdByUserId: user.id,
        },
      });
      return this.findOwnedReturn(user.organizationId, created.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('RETURN_EXISTS', 'A return of this type already exists for this period.');
      }
      throw err;
    }
  }

  async updateReturn(user: AuthenticatedUser, id: string, dto: UpdateGstReturnDto) {
    const existing = await this.findOwnedReturn(user.organizationId, id);
    const completing = dto.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    await this.prisma.$transaction(async (tx) => {
      await tx.gSTReturn.update({
        where: { id },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
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
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'gst_return_updated',
          entityType: 'gst_return',
          entityId: id,
          metadata: dto.status ? { status: dto.status } : undefined,
        },
      });
    });

    return this.findOwnedReturn(user.organizationId, id);
  }

  async createTaskForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnTaskDto) {
    const ret = await this.findOwnedReturn(user.organizationId, id);
    if (ret.taskId) throw new ConflictApiError('TASK_ALREADY_LINKED', 'A task is already linked to this return.');

    const task = await this.prisma.task.create({
      data: {
        organizationId: user.organizationId,
        clientId: ret.clientId,
        title: dto.title ?? `${ret.returnType} — ${ret.gstProfile.gstin} (${ret.taxPeriod})`,
        category: 'COMPLIANCE',
        dueDate: ret.dueDate,
        assignedUserId: dto.assignedUserId ?? ret.assignedUserId,
        createdByUserId: user.id,
      },
    });
    await this.prisma.gSTReturn.update({ where: { id }, data: { taskId: task.id } });
    return this.findOwnedReturn(user.organizationId, id);
  }

  async createReminderForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnReminderDto) {
    const ret = await this.findOwnedReturn(user.organizationId, id);
    await this.prisma.reminder.create({
      data: {
        organizationId: user.organizationId,
        entityType: 'GST_RETURN',
        entityId: id,
        userId: ret.assignedUserId ?? user.id,
        offsetLabel: 'CUSTOM',
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
    return { message: 'Reminder created.' };
  }

  async requestDocumentsForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnDocumentRequestDto) {
    const ret = await this.findOwnedReturn(user.organizationId, id);
    return this.documentRequests.create(user, {
      clientId: ret.clientId,
      title: dto.title ?? `${ret.returnType} documents — ${ret.taxPeriod}`,
      items: [
        { label: 'Sales register', isRequired: true },
        { label: 'Purchase register', isRequired: true },
        { label: 'E-way bills (if any)', isRequired: false },
      ],
    });
  }
}
