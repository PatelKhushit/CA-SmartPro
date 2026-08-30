import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateTdsProfileDto, UpdateTdsProfileDto } from './dto/tds-profile.dto.js';
import type {
  CreateReturnReminderDto,
  CreateReturnTaskDto,
  CreateTdsReturnDto,
  ListTdsReturnsDto,
  UpdateTdsReturnDto,
} from './dto/tds-return.dto.js';
import type { CreateCertificateDto, CreateChallanDto, UpdateCertificateDto, UpdateChallanDto } from './dto/challan-certificate.dto.js';

const RETURN_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
  tdsProfile: { select: { id: true, tan: true } },
  assignedUser: { select: { id: true, fullName: true } },
} satisfies Prisma.TDSReturnInclude;

@Injectable()
export class TdsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Profiles ---

  async listProfiles(organizationId: string, clientId?: string) {
    return this.prisma.tDSProfile.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      include: {
        client: { select: { id: true, displayName: true, clientCode: true } },
        _count: { select: { returns: true, challans: true, certificates: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProfile(user: AuthenticatedUser, dto: CreateTdsProfileDto) {
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, organizationId: user.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundApiError('CLIENT_NOT_FOUND', 'This client could not be found.');

    try {
      return await this.prisma.tDSProfile.create({
        data: { organizationId: user.organizationId, clientId: dto.clientId, tan: dto.tan, deductorType: dto.deductorType },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('TAN_IN_USE', 'This TAN is already registered for another profile.');
      }
      throw err;
    }
  }

  async updateProfile(user: AuthenticatedUser, id: string, dto: UpdateTdsProfileDto) {
    const profile = await this.prisma.tDSProfile.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!profile) throw new NotFoundApiError('TDS_PROFILE_NOT_FOUND', 'This TDS profile could not be found.');
    return this.prisma.tDSProfile.update({ where: { id }, data: dto });
  }

  // --- Returns ---

  async listReturns(organizationId: string, query: ListTdsReturnsDto) {
    const where: Prisma.TDSReturnWhereInput = {
      organizationId,
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search
        ? {
            OR: [
              { client: { displayName: { contains: query.search, mode: 'insensitive' } } },
              { tdsProfile: { tan: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.tDSReturn.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: RETURN_INCLUDE,
      }),
      this.prisma.tDSReturn.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async summary(organizationId: string) {
    const [totalClients, returnCounts, challansPending, certificatesPending] = await Promise.all([
      this.prisma.tDSProfile.findMany({ where: { organizationId, isActive: true }, distinct: ['clientId'], select: { clientId: true } }),
      this.prisma.tDSReturn.groupBy({ by: ['status'], where: { organizationId }, _count: true }),
      this.prisma.tDSChallan.count({ where: { organizationId, status: 'PENDING' } }),
      this.prisma.tDSCertificate.count({ where: { organizationId, status: 'PENDING' } }),
    ]);
    const counts = Object.fromEntries(returnCounts.map((r) => [r.status, r._count]));
    return {
      totalClients: totalClients.length,
      returnsDue: (counts.UPCOMING ?? 0) + (counts.DUE_TODAY ?? 0),
      returnsCompleted: counts.COMPLETED ?? 0,
      challansPending,
      certificatesPending,
      overdue: counts.OVERDUE ?? 0,
    };
  }

  private async findOwnedReturn(organizationId: string, id: string) {
    const ret = await this.prisma.tDSReturn.findFirst({ where: { id, organizationId }, include: RETURN_INCLUDE });
    if (!ret) throw new NotFoundApiError('TDS_RETURN_NOT_FOUND', 'This TDS return could not be found.');
    return ret;
  }

  async getReturn(organizationId: string, id: string) {
    return this.findOwnedReturn(organizationId, id);
  }

  async createReturn(user: AuthenticatedUser, dto: CreateTdsReturnDto) {
    const profile = await this.prisma.tDSProfile.findFirst({ where: { id: dto.tdsProfileId, organizationId: user.organizationId } });
    if (!profile) throw new NotFoundApiError('TDS_PROFILE_NOT_FOUND', 'This TDS profile could not be found.');

    try {
      const created = await this.prisma.tDSReturn.create({
        data: {
          organizationId: user.organizationId,
          tdsProfileId: dto.tdsProfileId,
          clientId: profile.clientId,
          returnType: dto.returnType,
          quarter: dto.quarter,
          dueDate: new Date(dto.dueDate),
          assignedUserId: dto.assignedUserId,
          notes: dto.notes,
          createdByUserId: user.id,
        },
      });
      return this.findOwnedReturn(user.organizationId, created.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('RETURN_EXISTS', 'A return of this type already exists for this quarter.');
      }
      throw err;
    }
  }

  async updateReturn(user: AuthenticatedUser, id: string, dto: UpdateTdsReturnDto) {
    const existing = await this.findOwnedReturn(user.organizationId, id);
    const completing = dto.status === 'COMPLETED' && existing.status !== 'COMPLETED';

    await this.prisma.$transaction(async (tx) => {
      await tx.tDSReturn.update({
        where: { id },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
          assignedUserId: dto.assignedUserId,
          notes: dto.notes,
          completedAt: completing ? new Date() : undefined,
        },
      });
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
          action: 'tds_return_updated',
          entityType: 'tds_return',
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
        title: dto.title ?? `${ret.returnType} — ${ret.tdsProfile.tan} (${ret.quarter})`,
        category: 'COMPLIANCE',
        dueDate: ret.dueDate,
        assignedUserId: dto.assignedUserId ?? ret.assignedUserId,
        createdByUserId: user.id,
      },
    });
    await this.prisma.tDSReturn.update({ where: { id }, data: { taskId: task.id } });
    return this.findOwnedReturn(user.organizationId, id);
  }

  async createReminderForReturn(user: AuthenticatedUser, id: string, dto: CreateReturnReminderDto) {
    const ret = await this.findOwnedReturn(user.organizationId, id);
    await this.prisma.reminder.create({
      data: {
        organizationId: user.organizationId,
        entityType: 'TDS_RETURN',
        entityId: id,
        userId: ret.assignedUserId ?? user.id,
        offsetLabel: 'CUSTOM',
        scheduledAt: new Date(dto.scheduledAt),
      },
    });
    return { message: 'Reminder created.' };
  }

  // --- Challans ---

  async listChallans(organizationId: string, clientId?: string) {
    return this.prisma.tDSChallan.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      include: { client: { select: { id: true, displayName: true } }, tdsProfile: { select: { id: true, tan: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createChallan(user: AuthenticatedUser, dto: CreateChallanDto) {
    const profile = await this.prisma.tDSProfile.findFirst({ where: { id: dto.tdsProfileId, organizationId: user.organizationId } });
    if (!profile) throw new NotFoundApiError('TDS_PROFILE_NOT_FOUND', 'This TDS profile could not be found.');

    return this.prisma.tDSChallan.create({
      data: {
        organizationId: user.organizationId,
        tdsProfileId: dto.tdsProfileId,
        clientId: profile.clientId,
        challanNumber: dto.challanNumber,
        amount: dto.amount,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        section: dto.section,
        status: dto.paymentDate ? 'PAID' : 'PENDING',
        createdByUserId: user.id,
      },
    });
  }

  async updateChallan(user: AuthenticatedUser, id: string, dto: UpdateChallanDto) {
    const challan = await this.prisma.tDSChallan.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!challan) throw new NotFoundApiError('CHALLAN_NOT_FOUND', 'This challan could not be found.');
    return this.prisma.tDSChallan.update({
      where: { id },
      data: { paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined, status: dto.status },
    });
  }

  // --- Certificates ---

  async listCertificates(organizationId: string, clientId?: string) {
    return this.prisma.tDSCertificate.findMany({
      where: { organizationId, ...(clientId ? { clientId } : {}) },
      include: { client: { select: { id: true, displayName: true } }, tdsProfile: { select: { id: true, tan: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCertificate(user: AuthenticatedUser, dto: CreateCertificateDto) {
    const profile = await this.prisma.tDSProfile.findFirst({ where: { id: dto.tdsProfileId, organizationId: user.organizationId } });
    if (!profile) throw new NotFoundApiError('TDS_PROFILE_NOT_FOUND', 'This TDS profile could not be found.');

    try {
      return await this.prisma.tDSCertificate.create({
        data: {
          organizationId: user.organizationId,
          tdsProfileId: dto.tdsProfileId,
          clientId: profile.clientId,
          certificateType: dto.certificateType,
          quarter: dto.quarter,
          createdByUserId: user.id,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictApiError('CERTIFICATE_EXISTS', 'A certificate of this type already exists for this quarter.');
      }
      throw err;
    }
  }

  async updateCertificate(user: AuthenticatedUser, id: string, dto: UpdateCertificateDto) {
    const cert = await this.prisma.tDSCertificate.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!cert) throw new NotFoundApiError('CERTIFICATE_NOT_FOUND', 'This certificate could not be found.');
    return this.prisma.tDSCertificate.update({
      where: { id },
      data: {
        status: dto.status,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : dto.status === 'ISSUED' ? new Date() : undefined,
      },
    });
  }
}
