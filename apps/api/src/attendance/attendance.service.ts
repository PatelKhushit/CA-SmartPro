import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApiError, ConflictApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { ListAttendanceDto, MarkAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto.js';

const RECORD_INCLUDE = {
  user: { select: { id: true, fullName: true } },
  markedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.AttendanceInclude;

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function monthRange(month?: string): { start: Date; end: Date } {
  const [year, mon] = month ? month.split('-').map(Number) : [new Date().getUTCFullYear(), new Date().getUTCMonth() + 1];
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(organizationId: string, user: AuthenticatedUser) {
    const today = todayUtc();
    const { start, end } = monthRange();

    const [myToday, myMonthRecords, teamPresentToday, teamSize] = await Promise.all([
      this.prisma.attendance.findFirst({ where: { organizationId, userId: user.id, date: today } }),
      this.prisma.attendance.findMany({
        where: { organizationId, userId: user.id, date: { gte: start, lt: end } },
        select: { status: true, workedMinutes: true },
      }),
      this.prisma.attendance.count({ where: { organizationId, date: today, status: { in: ['PRESENT', 'HALF_DAY'] } } }),
      this.prisma.user.count({ where: { organizationId, status: 'ACTIVE', deletedAt: null } }),
    ]);

    const counts = myMonthRecords.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    const totalWorkedMinutes = myMonthRecords.reduce((sum, r) => sum + (r.workedMinutes ?? 0), 0);

    return {
      today: {
        checkedIn: !!myToday?.checkInAt,
        checkedOut: !!myToday?.checkOutAt,
        status: myToday?.status ?? null,
        checkInAt: myToday?.checkInAt ?? null,
        checkOutAt: myToday?.checkOutAt ?? null,
      },
      thisMonth: {
        present: counts.PRESENT ?? 0,
        absent: counts.ABSENT ?? 0,
        halfDay: counts.HALF_DAY ?? 0,
        onLeave: counts.ON_LEAVE ?? 0,
        holiday: counts.HOLIDAY ?? 0,
        weekOff: counts.WEEK_OFF ?? 0,
        totalWorkedMinutes,
      },
      team: { presentToday: teamPresentToday, teamSize },
    };
  }

  async list(organizationId: string, query: ListAttendanceDto) {
    const where: Prisma.AttendanceWhereInput = {
      organizationId,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.month ? { date: { gte: monthRange(query.month).start, lt: monthRange(query.month).end } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: [{ date: 'desc' }, { user: { fullName: 'asc' } }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: RECORD_INCLUDE,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async checkIn(user: AuthenticatedUser) {
    const today = todayUtc();
    const existing = await this.prisma.attendance.findUnique({
      where: { organizationId_userId_date: { organizationId: user.organizationId, userId: user.id, date: today } },
    });
    if (existing?.checkInAt) {
      throw new ConflictApiError('ALREADY_CHECKED_IN', "You've already checked in today.");
    }

    const record = await this.prisma.attendance.upsert({
      where: { organizationId_userId_date: { organizationId: user.organizationId, userId: user.id, date: today } },
      create: {
        organizationId: user.organizationId,
        userId: user.id,
        date: today,
        status: 'PRESENT',
        checkInAt: new Date(),
        markedByUserId: user.id,
      },
      update: { status: 'PRESENT', checkInAt: new Date() },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'attendance_checked_in',
      entityType: 'attendance',
      entityId: record.id,
      after: record,
    });
    return this.findOwned(user.organizationId, record.id);
  }

  async checkOut(user: AuthenticatedUser) {
    const today = todayUtc();
    const existing = await this.prisma.attendance.findUnique({
      where: { organizationId_userId_date: { organizationId: user.organizationId, userId: user.id, date: today } },
    });
    if (!existing?.checkInAt) {
      throw new ApiError('NOT_CHECKED_IN', "You haven't checked in today yet.");
    }
    if (existing.checkOutAt) {
      throw new ConflictApiError('ALREADY_CHECKED_OUT', "You've already checked out today.");
    }

    const checkOutAt = new Date();
    const workedMinutes = Math.max(0, Math.round((checkOutAt.getTime() - existing.checkInAt.getTime()) / 60000));
    const record = await this.prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt, workedMinutes },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'attendance_checked_out',
      entityType: 'attendance',
      entityId: record.id,
      before: existing,
      after: record,
    });
    return this.findOwned(user.organizationId, record.id);
  }

  private async findOwned(organizationId: string, id: string) {
    const record = await this.prisma.attendance.findFirst({ where: { id, organizationId }, include: RECORD_INCLUDE });
    if (!record) throw new NotFoundApiError('ATTENDANCE_NOT_FOUND', 'This attendance record could not be found.');
    return record;
  }

  async mark(user: AuthenticatedUser, dto: MarkAttendanceDto) {
    const target = await this.prisma.user.findFirst({ where: { id: dto.userId, organizationId: user.organizationId, deletedAt: null } });
    if (!target) throw new NotFoundApiError('USER_NOT_FOUND', 'This team member could not be found.');

    const date = new Date(dto.date);
    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: { organizationId_userId_date: { organizationId: user.organizationId, userId: dto.userId, date } },
      });
      const after = await tx.attendance.upsert({
        where: { organizationId_userId_date: { organizationId: user.organizationId, userId: dto.userId, date } },
        create: {
          organizationId: user.organizationId,
          userId: dto.userId,
          date,
          status: dto.status,
          notes: dto.notes,
          markedByUserId: user.id,
        },
        update: { status: dto.status, notes: dto.notes, markedByUserId: user.id },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: existing ? 'attendance_updated' : 'attendance_marked',
          entityType: 'attendance',
          entityId: after.id,
          before: existing ?? undefined,
          after,
          metadata: { targetUserId: dto.userId, status: dto.status },
        },
        tx,
      );
      return after;
    });
    return this.findOwned(user.organizationId, record.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateAttendanceDto) {
    const existing = await this.findOwned(user.organizationId, id);

    const checkInAt = dto.checkInAt ? new Date(dto.checkInAt) : existing.checkInAt;
    const checkOutAt = dto.checkOutAt ? new Date(dto.checkOutAt) : existing.checkOutAt;
    const workedMinutes = checkInAt && checkOutAt ? Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000)) : existing.workedMinutes;

    const after = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.attendance.update({
        where: { id },
        data: {
          status: dto.status,
          checkInAt: dto.checkInAt ? checkInAt : undefined,
          checkOutAt: dto.checkOutAt ? checkOutAt : undefined,
          workedMinutes,
          notes: dto.notes,
        },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'attendance_updated',
          entityType: 'attendance',
          entityId: id,
          before: existing,
          after: updated,
        },
        tx,
      );
      return updated;
    });
    return this.findOwned(user.organizationId, after.id);
  }
}
