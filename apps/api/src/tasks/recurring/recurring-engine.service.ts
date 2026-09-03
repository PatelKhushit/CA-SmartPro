import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { getDueDate, getPeriodKey } from '../../common/period/period.util.js';

export interface GenerationSummary {
  templatesConsidered: number;
  tasksCreated: number;
  tasksSkippedExisting: number;
}

@Injectable()
export class RecurringEngineService {
  private readonly logger = new Logger(RecurringEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Runs the engine for every organization. Safe to call repeatedly — idempotent by design. */
  async generateAll(referenceDate: Date = new Date()): Promise<GenerationSummary> {
    const orgs = await this.prisma.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const totals: GenerationSummary = { templatesConsidered: 0, tasksCreated: 0, tasksSkippedExisting: 0 };
    for (const org of orgs) {
      const result = await this.generateForOrganization(org.id, referenceDate);
      totals.templatesConsidered += result.templatesConsidered;
      totals.tasksCreated += result.tasksCreated;
      totals.tasksSkippedExisting += result.tasksSkippedExisting;
    }
    return totals;
  }

  async generateForOrganization(organizationId: string, referenceDate: Date = new Date()): Promise<GenerationSummary> {
    const today = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

    const templates = await this.prisma.taskTemplate.findMany({
      where: { organizationId, isActive: true, frequency: { not: 'ONE_TIME' } },
    });

    const summary: GenerationSummary = { templatesConsidered: templates.length, tasksCreated: 0, tasksSkippedExisting: 0 };

    for (const template of templates) {
      const periodKey = getPeriodKey(template.frequency, today);
      const dueDate = getDueDate(template.frequency, template.dueDayOfPeriod, today);
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);

      if (daysUntilDue > template.leadDays) {
        continue; // too early to generate this period's task yet
      }

      const checklistTitles = Array.isArray(template.checklistItems)
        ? (template.checklistItems as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];

      if (template.scope === 'FIRM_WIDE') {
        const created = await this.createTaskIfAbsent({
          organizationId,
          clientId: null,
          template,
          periodKey,
          dueDate,
          today,
          checklistTitles,
        });
        if (created) summary.tasksCreated++;
        else summary.tasksSkippedExisting++;
        continue;
      }

      const clientWhere: Prisma.ClientWhereInput = {
        organizationId,
        status: 'ACTIVE',
        deletedAt: null,
        ...(template.applicableServiceType
          ? { services: { some: { category: template.applicableServiceType, status: 'ACTIVE' } } }
          : {}),
      };
      const clients = await this.prisma.client.findMany({ where: clientWhere, select: { id: true, assignedUserId: true } });

      for (const client of clients) {
        const created = await this.createTaskIfAbsent({
          organizationId,
          clientId: client.id,
          assignedUserId: client.assignedUserId,
          template,
          periodKey,
          dueDate,
          today,
          checklistTitles,
        });
        if (created) summary.tasksCreated++;
        else summary.tasksSkippedExisting++;
      }
    }

    return summary;
  }

  private async createTaskIfAbsent(args: {
    organizationId: string;
    clientId: string | null;
    assignedUserId?: string | null;
    template: Prisma.TaskTemplateGetPayload<object>;
    periodKey: string;
    dueDate: Date;
    today: Date;
    checklistTitles: string[];
  }): Promise<boolean> {
    const { organizationId, clientId, assignedUserId, template, periodKey, dueDate, today, checklistTitles } = args;
    try {
      await this.prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
          data: {
            organizationId,
            clientId,
            templateId: template.id,
            title: template.name,
            description: template.description,
            category: template.category,
            frequency: template.frequency,
            priority: template.defaultPriority,
            assignedUserId: assignedUserId ?? null,
            createdByUserId: template.createdByUserId,
            dueDate,
            startDate: today,
            estimatedMinutes: template.estimatedMinutes,
            recurrencePeriodKey: periodKey,
          },
        });
        if (checklistTitles.length > 0) {
          await tx.taskChecklistItem.createMany({
            data: checklistTitles.map((title, index) => ({ taskId: task.id, title, order: index })),
          });
        }
        await this.audit.log(
          {
            organizationId,
            action: 'task_generated',
            entityType: 'task',
            entityId: task.id,
            after: task,
            metadata: { templateId: template.id, periodKey, source: 'recurring_engine' },
          },
          tx,
        );
      });
      return true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return false; // already generated for this template/client/period — expected, not an error
      }
      this.logger.error(`Failed to generate task for template ${template.id}: ${String(err)}`);
      throw err;
    }
  }
}
