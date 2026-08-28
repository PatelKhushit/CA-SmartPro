import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function offsetLabelFor(daysUntilDue: number): string | null {
  if (daysUntilDue === 7) return '7_DAYS_BEFORE';
  if (daysUntilDue === 3) return '3_DAYS_BEFORE';
  if (daysUntilDue === 1) return '1_DAY_BEFORE';
  if (daysUntilDue === 0) return 'DUE_TODAY';
  if (daysUntilDue < 0) return 'OVERDUE';
  return null;
}

export interface ReminderRunSummary {
  tasksReminded: number;
  complianceReminded: number;
}

/**
 * IN_APP reminder engine (spec section 22). EMAIL/WHATSAPP channels are
 * schema-ready (Reminder.channel enum) but not wired to a provider yet —
 * see docs/STATUS.md. Runs once daily; safe to re-run (dedupes per
 * entity+offset+day so nobody gets spammed by repeated cron ticks).
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async runForOrganization(organizationId: string, referenceDate: Date = new Date()): Promise<ReminderRunSummary> {
    const today = startOfDay(referenceDate);
    const summary: ReminderRunSummary = { tasksReminded: 0, complianceReminded: 0 };

    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        dueDate: { not: null },
        assignedUserId: { not: null },
      },
      select: { id: true, title: true, dueDate: true, assignedUserId: true },
    });

    for (const task of tasks) {
      const daysUntilDue = Math.round((task.dueDate!.getTime() - today.getTime()) / 86_400_000);
      const offsetLabel = offsetLabelFor(daysUntilDue);
      if (!offsetLabel) continue;

      const alreadySent = await this.hasReminderToday(organizationId, 'TASK', task.id, offsetLabel, today);
      if (alreadySent) continue;

      await this.sendReminder({
        organizationId,
        entityType: 'TASK',
        entityId: task.id,
        offsetLabel,
        userId: task.assignedUserId!,
        notificationType: offsetLabel === 'OVERDUE' ? 'TASK_OVERDUE' : 'TASK_DUE',
        title: offsetLabel === 'OVERDUE' ? 'Task overdue' : 'Task due soon',
        body: `"${task.title}" ${offsetLabel === 'OVERDUE' ? 'is overdue.' : `is due ${offsetLabel === 'DUE_TODAY' ? 'today' : `in ${daysUntilDue} day(s)`}.`}`,
      });
      summary.tasksReminded++;
    }

    const complianceEvents = await this.prisma.complianceEvent.findMany({
      where: { organizationId, status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } },
      include: {
        client: { select: { id: true, displayName: true, assignedUserId: true } },
        complianceRule: { select: { name: true } },
      },
    });

    for (const event of complianceEvents) {
      const daysUntilDue = Math.round((event.dueDate.getTime() - today.getTime()) / 86_400_000);
      const offsetLabel = offsetLabelFor(daysUntilDue);
      if (!offsetLabel) continue;

      const alreadySent = await this.hasReminderToday(organizationId, 'COMPLIANCE_EVENT', event.id, offsetLabel, today);
      if (alreadySent) continue;

      const recipientId = event.client.assignedUserId ?? (await this.fallbackFirmAdmin(organizationId));
      if (!recipientId) continue;

      await this.sendReminder({
        organizationId,
        entityType: 'COMPLIANCE_EVENT',
        entityId: event.id,
        offsetLabel,
        userId: recipientId,
        notificationType: 'COMPLIANCE_DUE',
        title: offsetLabel === 'OVERDUE' ? 'Compliance item overdue' : 'Compliance item due soon',
        body: `${event.complianceRule.name} for ${event.client.displayName} ${offsetLabel === 'OVERDUE' ? 'is overdue.' : `is due ${offsetLabel === 'DUE_TODAY' ? 'today' : `in ${daysUntilDue} day(s)`}.`}`,
      });
      summary.complianceReminded++;
    }

    return summary;
  }

  private async hasReminderToday(
    organizationId: string,
    entityType: 'TASK' | 'COMPLIANCE_EVENT',
    entityId: string,
    offsetLabel: string,
    today: Date,
  ) {
    const existing = await this.prisma.reminder.findFirst({
      where: { organizationId, entityType, entityId, offsetLabel, createdAt: { gte: today } },
    });
    return !!existing;
  }

  private async fallbackFirmAdmin(organizationId: string): Promise<string | null> {
    const admin = await this.prisma.user.findFirst({
      where: { organizationId, status: 'ACTIVE', role: { key: 'FIRM_ADMIN' } },
      select: { id: true },
    });
    return admin?.id ?? null;
  }

  private async sendReminder(args: {
    organizationId: string;
    entityType: 'TASK' | 'COMPLIANCE_EVENT';
    entityId: string;
    offsetLabel: string;
    userId: string;
    notificationType: 'TASK_DUE' | 'TASK_OVERDUE' | 'COMPLIANCE_DUE';
    title: string;
    body: string;
  }) {
    await this.prisma.reminder.create({
      data: {
        organizationId: args.organizationId,
        entityType: args.entityType,
        entityId: args.entityId,
        userId: args.userId,
        channel: 'IN_APP',
        offsetLabel: args.offsetLabel,
        scheduledAt: new Date(),
        status: 'SENT',
        sentAt: new Date(),
      },
    });
    await this.notifications.notify({
      organizationId: args.organizationId,
      userId: args.userId,
      type: args.notificationType,
      title: args.title,
      body: args.body,
      entityType: args.entityType.toLowerCase(),
      entityId: args.entityId,
    });
  }
}
