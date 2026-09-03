import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApiError, ConflictApiError, ForbiddenApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateLeaveRequestDto, ListLeaveRequestsDto, ReviewLeaveRequestDto } from './dto/leave-request.dto.js';

const REQUEST_INCLUDE = {
  user: { select: { id: true, fullName: true } },
  reviewedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.LeaveRequestInclude;

function datesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(user: AuthenticatedUser) {
    const yearStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1));
    const canManage = user.permissions.includes('leave.manage');

    const [myRequests, teamPending] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: { organizationId: user.organizationId, userId: user.id, startDate: { gte: yearStart, lt: yearEnd } },
        select: { status: true, days: true },
      }),
      canManage
        ? this.prisma.leaveRequest.count({ where: { organizationId: user.organizationId, status: 'PENDING' } })
        : Promise.resolve(0),
    ]);

    const counts = myRequests.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    const daysTakenThisYear = myRequests.filter((r) => r.status === 'APPROVED').reduce((sum, r) => sum + Number(r.days), 0);

    return {
      myRequests: {
        pending: counts.PENDING ?? 0,
        approved: counts.APPROVED ?? 0,
        rejected: counts.REJECTED ?? 0,
        daysTakenThisYear,
      },
      team: { pendingApprovals: teamPending },
    };
  }

  async list(user: AuthenticatedUser, query: ListLeaveRequestsDto) {
    const canManage = user.permissions.includes('leave.manage');
    const where: Prisma.LeaveRequestWhereInput = {
      organizationId: user.organizationId,
      ...(canManage ? (query.userId ? { userId: query.userId } : {}) : { userId: user.id }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.year
        ? { startDate: { gte: new Date(Date.UTC(query.year, 0, 1)), lt: new Date(Date.UTC(query.year + 1, 0, 1)) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: REQUEST_INCLUDE,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwned(organizationId: string, id: string) {
    const request = await this.prisma.leaveRequest.findFirst({ where: { id, organizationId }, include: REQUEST_INCLUDE });
    if (!request) throw new NotFoundApiError('LEAVE_REQUEST_NOT_FOUND', 'This leave request could not be found.');
    return request;
  }

  async create(user: AuthenticatedUser, dto: CreateLeaveRequestDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate.getTime() < startDate.getTime()) {
      throw new ApiError('INVALID_DATE_RANGE', 'End date cannot be before the start date.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          leaveType: dto.leaveType,
          startDate,
          endDate,
          days: dto.days,
          reason: dto.reason,
        },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'leave_requested',
          entityType: 'leave_request',
          entityId: request.id,
          after: request,
          metadata: { leaveType: dto.leaveType, days: dto.days },
        },
        tx,
      );
      return request;
    });
    return this.findOwned(user.organizationId, created.id);
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const existing = await this.findOwned(user.organizationId, id);
    const canManage = user.permissions.includes('leave.manage');
    if (existing.userId !== user.id && !canManage) {
      throw new ForbiddenApiError('NOT_YOUR_REQUEST', 'You can only cancel your own leave requests.');
    }
    if (existing.status !== 'PENDING') {
      throw new ConflictApiError('NOT_CANCELLABLE', 'Only pending leave requests can be cancelled.');
    }

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'leave_cancelled', entityType: 'leave_request', entityId: id, before: existing, after },
        tx,
      );
    });
    return this.findOwned(user.organizationId, id);
  }

  async approve(user: AuthenticatedUser, id: string, dto: ReviewLeaveRequestDto) {
    const existing = await this.findOwned(user.organizationId, id);
    if (existing.status !== 'PENDING') {
      throw new ConflictApiError('NOT_PENDING', 'Only pending leave requests can be approved.');
    }

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedByUserId: user.id, reviewedAt: new Date(), reviewNotes: dto.reviewNotes },
      });

      const dates = datesInRange(existing.startDate, existing.endDate);
      const status = dates.length === 1 && Number(existing.days) === 0.5 ? 'HALF_DAY' : 'ON_LEAVE';
      for (const date of dates) {
        await tx.attendance.upsert({
          where: { organizationId_userId_date: { organizationId: user.organizationId, userId: existing.userId, date } },
          create: { organizationId: user.organizationId, userId: existing.userId, date, status, markedByUserId: user.id },
          update: { status, markedByUserId: user.id },
        });
      }

      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'leave_approved',
          entityType: 'leave_request',
          entityId: id,
          before: existing,
          after,
          metadata: { daysMarked: dates.length },
        },
        tx,
      );
    });
    return this.findOwned(user.organizationId, id);
  }

  async reject(user: AuthenticatedUser, id: string, dto: ReviewLeaveRequestDto) {
    const existing = await this.findOwned(user.organizationId, id);
    if (existing.status !== 'PENDING') {
      throw new ConflictApiError('NOT_PENDING', 'Only pending leave requests can be rejected.');
    }

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'REJECTED', reviewedByUserId: user.id, reviewedAt: new Date(), reviewNotes: dto.reviewNotes },
      });
      await this.audit.log(
        { organizationId: user.organizationId, userId: user.id, action: 'leave_rejected', entityType: 'leave_request', entityId: id, before: existing, after },
        tx,
      );
    });
    return this.findOwned(user.organizationId, id);
  }
}
