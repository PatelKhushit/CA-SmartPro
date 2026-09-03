import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ApiError, ForbiddenApiError, NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateTaskDto } from './dto/create-task.dto.js';
import type { UpdateTaskDto } from './dto/update-task.dto.js';
import type { ListTasksDto } from './dto/list-tasks.dto.js';
import type { AddCommentDto, AssignTaskDto, RescheduleTaskDto } from './dto/misc.dto.js';
import { rankTasksByPriority } from './priority-engine.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function endOfToday(): Date {
  const start = startOfToday();
  return new Date(start.getTime() + 86_400_000 - 1);
}

const TASK_INCLUDE = {
  client: { select: { id: true, displayName: true, clientCode: true } },
  assignedUser: { select: { id: true, fullName: true } },
  checklistItems: { orderBy: { order: Prisma.SortOrder.asc } },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(organizationId: string, query: ListTasksDto) {
    const where: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    if (query.myDay) {
      where.assignedUserId = query.assignedUserId ?? undefined;
      where.status = { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] };
      where.OR = [{ dueDate: { lte: endOfToday() } }, { dueDate: null }];
    }
    if (query.overdue) {
      where.status = { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] };
      where.dueDate = { lt: startOfToday() };
    }
    if (query.dueBefore || query.dueAfter) {
      where.dueDate = {
        ...(query.dueBefore ? { lte: new Date(query.dueBefore) } : {}),
        ...(query.dueAfter ? { gte: new Date(query.dueAfter) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: TASK_INCLUDE,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  private async findOwned(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { ...TASK_INCLUDE, comments: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'asc' } } },
    });
    if (!task) throw new NotFoundApiError('TASK_NOT_FOUND', 'This task could not be found.');
    return task;
  }

  get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateTaskDto) {
    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          organizationId: user.organizationId,
          clientId: dto.clientId,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          frequency: 'ONE_TIME',
          priority: dto.priority,
          assignedUserId: dto.assignedUserId,
          createdByUserId: user.id,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          estimatedMinutes: dto.estimatedMinutes,
          checklistItems: dto.checklistItems?.length
            ? { create: dto.checklistItems.map((title, index) => ({ title, order: index })) }
            : undefined,
        },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'task_created',
          entityType: 'task',
          entityId: created.id,
          after: created,
        },
        tx,
      );
      return created;
    });
    return this.findOwned(user.organizationId, task.id);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateTaskDto) {
    const existing = await this.findOwned(user.organizationId, id);

    if (dto.assignedUserId !== undefined && dto.assignedUserId !== existing.assignedUserId) {
      if (!user.permissions.includes('tasks.assign')) {
        throw new ForbiddenApiError('PERMISSION_DENIED', 'You do not have permission to assign tasks.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const after = await tx.task.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          clientId: dto.clientId,
          category: dto.category,
          priority: dto.priority,
          status: dto.status,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          estimatedMinutes: dto.estimatedMinutes,
          actualMinutes: dto.actualMinutes,
          assignedUserId: dto.assignedUserId,
        },
      });
      if (dto.assignedUserId !== undefined && dto.assignedUserId !== existing.assignedUserId) {
        await tx.taskAssignment.create({
          data: { taskId: id, userId: dto.assignedUserId, assignedById: user.id },
        });
        await this.audit.log(
          {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'task_assigned',
            entityType: 'task',
            entityId: id,
            before: existing,
            after,
            metadata: { assignedUserId: dto.assignedUserId },
          },
          tx,
        );
      } else {
        await this.audit.log(
          {
            organizationId: user.organizationId,
            userId: user.id,
            action: 'task_updated',
            entityType: 'task',
            entityId: id,
            before: existing,
            after,
          },
          tx,
        );
      }
    });

    if (
      dto.assignedUserId !== undefined &&
      dto.assignedUserId !== existing.assignedUserId &&
      dto.assignedUserId !== user.id
    ) {
      await this.notifications.notify({
        organizationId: user.organizationId,
        userId: dto.assignedUserId,
        type: 'ASSIGNMENT',
        title: 'New task assigned to you',
        body: `${user.fullName} assigned you "${existing.title}".`,
        entityType: 'task',
        entityId: id,
      });
    }

    return this.findOwned(user.organizationId, id);
  }

  async assign(user: AuthenticatedUser, id: string, dto: AssignTaskDto) {
    return this.update(user, id, { assignedUserId: dto.assignedUserId } as UpdateTaskDto);
  }

  async complete(user: AuthenticatedUser, id: string) {
    const before = await this.findOwned(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      const after = await tx.task.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'task_completed',
          entityType: 'task',
          entityId: id,
          before,
          after,
        },
        tx,
      );
    });
    return this.findOwned(user.organizationId, id);
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: RescheduleTaskDto) {
    const before = await this.findOwned(user.organizationId, id);
    await this.prisma.$transaction(async (tx) => {
      const after = await tx.task.update({ where: { id }, data: { dueDate: new Date(dto.dueDate) } });
      if (dto.reason) {
        await tx.taskComment.create({
          data: { taskId: id, organizationId: user.organizationId, userId: user.id, body: `Rescheduled: ${dto.reason}` },
        });
      }
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'task_rescheduled',
          entityType: 'task',
          entityId: id,
          before,
          after,
          metadata: { newDueDate: dto.dueDate },
        },
        tx,
      );
    });
    return this.findOwned(user.organizationId, id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
    return { message: 'Task cancelled.' };
  }

  async toggleChecklistItem(user: AuthenticatedUser, taskId: string, itemId: string) {
    await this.findOwned(user.organizationId, taskId);
    const item = await this.prisma.taskChecklistItem.findFirst({ where: { id: itemId, taskId } });
    if (!item) throw new NotFoundApiError('CHECKLIST_ITEM_NOT_FOUND', 'This checklist item could not be found.');
    await this.prisma.taskChecklistItem.update({
      where: { id: itemId },
      data: item.isDone
        ? { isDone: false, doneAt: null, doneByUserId: null }
        : { isDone: true, doneAt: new Date(), doneByUserId: user.id },
    });
    return this.findOwned(user.organizationId, taskId);
  }

  async addComment(user: AuthenticatedUser, taskId: string, dto: AddCommentDto) {
    await this.findOwned(user.organizationId, taskId);
    await this.prisma.taskComment.create({
      data: { taskId, organizationId: user.organizationId, userId: user.id, body: dto.body },
    });
    return this.findOwned(user.organizationId, taskId);
  }

  /** Today's tasks for the current user, ranked by the priority engine — powers "My Day". */
  async getMyDay(user: AuthenticatedUser) {
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId: user.organizationId,
        assignedUserId: user.id,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        OR: [{ dueDate: { lte: endOfToday() } }, { dueDate: null }],
      },
      include: TASK_INCLUDE,
    });

    const ranked = rankTasksByPriority(tasks);
    const overdueCount = tasks.filter((t) => t.dueDate && t.dueDate < startOfToday()).length;
    const highPriorityCount = tasks.filter((t) => t.priority === 'HIGH' || t.priority === 'URGENT').length;
    const followUpCount = tasks.filter((t) => t.category === 'FOLLOW_UP').length;
    const paymentTaskCount = tasks.filter((t) => t.category === 'PAYMENT').length;

    const [completedToday, totalActiveToday, complianceDueCount] = await Promise.all([
      this.prisma.task.count({
        where: {
          organizationId: user.organizationId,
          assignedUserId: user.id,
          status: 'COMPLETED',
          completedAt: { gte: startOfToday(), lte: endOfToday() },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId: user.organizationId,
          assignedUserId: user.id,
          deletedAt: null,
          OR: [
            { status: 'COMPLETED', completedAt: { gte: startOfToday(), lte: endOfToday() } },
            { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lte: endOfToday() } },
          ],
        },
      }),
      // Firm-wide, not just this user's assignments — compliance due-dates are
      // a practice-level concern everyone on My Day should see, same as the
      // Compliance Calendar itself.
      this.prisma.complianceEvent.count({
        where: {
          organizationId: user.organizationId,
          status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] },
          dueDate: { lte: endOfToday() },
        },
      }),
    ]);

    return {
      tasks: ranked,
      nextBestTask: ranked[0] ?? null,
      counts: {
        total: totalActiveToday,
        completed: completedToday,
        pending: ranked.length,
        overdue: overdueCount,
        followUps: followUpCount,
        highPriority: highPriorityCount,
        paymentTasks: paymentTaskCount,
        complianceDue: complianceDueCount,
        productivityPercent: totalActiveToday === 0 ? 0 : Math.round((completedToday / totalActiveToday) * 100),
      },
    };
  }

  // --- Time tracking ---
  // A running entry has endedAt = null. Server-persisted from the moment it
  // starts, so it survives a page refresh or browser crash — unlike the old
  // Focus Mode page's pure-client setInterval timer. Task.actualMinutes
  // accumulates every stopped entry's duration rather than being overwritten.

  async getRunningTimer(user: AuthenticatedUser) {
    return this.prisma.taskTimeEntry.findFirst({
      where: { organizationId: user.organizationId, userId: user.id, endedAt: null },
      include: { task: { select: { id: true, title: true, client: { select: { displayName: true } } } } },
    });
  }

  async startTimer(user: AuthenticatedUser, taskId: string) {
    await this.findOwned(user.organizationId, taskId);

    const existing = await this.prisma.taskTimeEntry.findFirst({
      where: { organizationId: user.organizationId, userId: user.id, endedAt: null },
    });
    if (existing) {
      if (existing.taskId === taskId) return existing; // already running on this task — idempotent, no duplicate entry
      await this.stopTimerEntry(user, existing); // starting a new timer auto-stops whatever else was running
    }

    const entry = await this.prisma.taskTimeEntry.create({
      data: { organizationId: user.organizationId, taskId, userId: user.id, startedAt: new Date() },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'task_timer_started',
      entityType: 'task',
      entityId: taskId,
      after: entry,
    });
    return entry;
  }

  async stopTimer(user: AuthenticatedUser, taskId: string) {
    const entry = await this.prisma.taskTimeEntry.findFirst({
      where: { organizationId: user.organizationId, userId: user.id, taskId, endedAt: null },
    });
    if (!entry) throw new ApiError('TIMER_NOT_RUNNING', 'There is no running timer for this task.');
    return this.stopTimerEntry(user, entry);
  }

  private async stopTimerEntry(user: AuthenticatedUser, entry: { id: string; taskId: string; startedAt: Date }) {
    const endedAt = new Date();
    const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - entry.startedAt.getTime()) / 60000));

    return this.prisma.$transaction(async (tx) => {
      const after = await tx.taskTimeEntry.update({ where: { id: entry.id }, data: { endedAt, durationMinutes } });
      const task = await tx.task.findUniqueOrThrow({ where: { id: entry.taskId }, select: { actualMinutes: true } });
      await tx.task.update({ where: { id: entry.taskId }, data: { actualMinutes: (task.actualMinutes ?? 0) + durationMinutes } });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'task_timer_stopped',
          entityType: 'task',
          entityId: entry.taskId,
          after,
          metadata: { durationMinutes },
        },
        tx,
      );
      return after;
    });
  }

  async listTimeEntries(organizationId: string, taskId: string) {
    return this.prisma.taskTimeEntry.findMany({
      where: { organizationId, taskId },
      orderBy: { startedAt: 'desc' },
      include: { user: { select: { id: true, fullName: true } } },
    });
  }
}
