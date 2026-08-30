import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { isAutomationAction, isClientActiveCondition, type AutomationAction } from './automation-types.js';

interface EntityContext {
  entityType: 'TASK' | 'COMPLIANCE_EVENT' | 'DOCUMENT_REQUEST';
  entityId: string;
  clientId: string | null;
  clientStatus: string | null;
  assignedUserId: string | null;
  title: string;
  dueDate: Date | null;
}

/**
 * Real trigger evaluation, not a stub: runs every 15 minutes via
 * @nestjs/schedule (the same cron infra as DailySchedulerService), plus a
 * manual "run now" path for testing/demo (see AutomationsController). Every
 * (rule, entity) pair executes at most once ever — enforced by the DB unique
 * constraint on AutomationExecution, which is the actual idempotency
 * guarantee, not just an in-memory check.
 */
@Injectable()
export class AutomationsEngineService {
  private readonly logger = new Logger(AutomationsEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/15 * * * *')
  async runScheduled() {
    await this.runForAllOrganizations();
  }

  async runForAllOrganizations() {
    const orgs = await this.prisma.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    let executionsCreated = 0;
    for (const org of orgs) {
      executionsCreated += await this.runForOrganization(org.id);
    }
    return { organizationsProcessed: orgs.length, executionsCreated };
  }

  async runForOrganization(organizationId: string): Promise<number> {
    const rules = await this.prisma.automationRule.findMany({ where: { organizationId, isEnabled: true } });
    let created = 0;
    for (const rule of rules) {
      try {
        const entities = await this.resolveEntities(organizationId, rule.triggerType, rule.triggerConfig);
        for (const entity of entities) {
          if (await this.tryExecute(rule, entity)) created++;
        }
        if (entities.length > 0) {
          await this.prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
        }
      } catch (err) {
        this.logger.error(`Automation rule ${rule.id} failed to evaluate: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return created;
  }

  private async resolveEntities(
    organizationId: string,
    triggerType: string,
    triggerConfig: Prisma.JsonValue,
  ): Promise<EntityContext[]> {
    if (triggerType === 'TASK_OVERDUE') {
      const tasks = await this.prisma.task.findMany({
        where: { organizationId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: new Date() } },
        select: { id: true, title: true, dueDate: true, assignedUserId: true, clientId: true, client: { select: { status: true } } },
        take: 200,
      });
      return tasks.map((t) => ({
        entityType: 'TASK' as const,
        entityId: t.id,
        clientId: t.clientId,
        clientStatus: t.client?.status ?? null,
        assignedUserId: t.assignedUserId,
        title: t.title,
        dueDate: t.dueDate,
      }));
    }

    if (triggerType === 'COMPLIANCE_DUE_SOON') {
      const daysBefore = this.readDaysBefore(triggerConfig);
      const windowEnd = new Date(Date.now() + daysBefore * 86_400_000);
      const events = await this.prisma.complianceEvent.findMany({
        where: { organizationId, status: { in: ['UPCOMING', 'DUE'] }, dueDate: { lte: windowEnd } },
        select: {
          id: true,
          dueDate: true,
          clientId: true,
          client: { select: { status: true, assignedUserId: true } },
          complianceRule: { select: { name: true } },
        },
        take: 200,
      });
      return events.map((e) => ({
        entityType: 'COMPLIANCE_EVENT' as const,
        entityId: e.id,
        clientId: e.clientId,
        clientStatus: e.client.status,
        assignedUserId: e.client.assignedUserId,
        title: e.complianceRule.name,
        dueDate: e.dueDate,
      }));
    }

    if (triggerType === 'DOCUMENT_REQUEST_OVERDUE') {
      const requests = await this.prisma.documentRequest.findMany({
        where: { organizationId, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: new Date() } },
        select: { id: true, title: true, dueDate: true, clientId: true, client: { select: { status: true, assignedUserId: true } } },
        take: 200,
      });
      return requests.map((r) => ({
        entityType: 'DOCUMENT_REQUEST' as const,
        entityId: r.id,
        clientId: r.clientId,
        clientStatus: r.client.status,
        assignedUserId: r.client.assignedUserId,
        title: r.title,
        dueDate: r.dueDate,
      }));
    }

    return [];
  }

  private readDaysBefore(config: Prisma.JsonValue): number {
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      const value = (config as Record<string, unknown>).daysBefore;
      if (typeof value === 'number' && value > 0) return value;
    }
    return 7;
  }

  private async tryExecute(
    rule: { id: string; organizationId: string; conditions: Prisma.JsonValue; actions: Prisma.JsonValue },
    entity: EntityContext,
  ): Promise<boolean> {
    const already = await this.prisma.automationExecution.findUnique({
      where: {
        automationRuleId_triggerEntityType_triggerEntityId: {
          automationRuleId: rule.id,
          triggerEntityType: entity.entityType,
          triggerEntityId: entity.entityId,
        },
      },
    });
    if (already) return false;

    const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
    for (const raw of conditions) {
      if (!isClientActiveCondition(raw)) {
        await this.recordExecution(rule.organizationId, rule.id, entity, 'SKIPPED', [], 'Unsupported condition type — skipped rather than guessed.');
        return true;
      }
      if (entity.clientStatus !== raw.value) {
        await this.recordExecution(rule.organizationId, rule.id, entity, 'SKIPPED', [], `Condition not met: client.status !== ${raw.value}`);
        return true;
      }
    }

    const actions = Array.isArray(rule.actions) ? rule.actions : [];
    const summary: Array<{ type: string; status: string; detail?: string }> = [];
    let anyFailed = false;

    for (const raw of actions) {
      if (!isAutomationAction(raw)) {
        summary.push({ type: 'UNKNOWN', status: 'FAILED', detail: 'Malformed action' });
        anyFailed = true;
        continue;
      }
      const result = await this.runAction(rule.organizationId, entity, raw);
      summary.push(result);
      if (result.status === 'FAILED') anyFailed = true;
    }

    await this.recordExecution(rule.organizationId, rule.id, entity, anyFailed ? 'FAILED' : 'SUCCESS', summary);
    return true;
  }

  private async runAction(
    organizationId: string,
    entity: EntityContext,
    action: AutomationAction,
  ): Promise<{ type: string; status: string; detail?: string }> {
    if (action.type === 'CREATE_NOTIFICATION') {
      if (!entity.assignedUserId) return { type: action.type, status: 'SKIPPED', detail: 'No assignee to notify.' };
      await this.notifications.notify({
        organizationId,
        userId: entity.assignedUserId,
        type: entity.entityType === 'TASK' ? 'TASK_OVERDUE' : entity.entityType === 'COMPLIANCE_EVENT' ? 'COMPLIANCE_DUE' : 'SYSTEM',
        title: action.title,
        body: `${action.body} — ${entity.title}`,
        entityType: entity.entityType.toLowerCase(),
        entityId: entity.entityId,
      });
      return { type: action.type, status: 'SUCCESS' };
    }

    if (action.type === 'CREATE_TASK') {
      if (!entity.clientId) return { type: action.type, status: 'SKIPPED', detail: 'No client to attach the task to.' };
      const creatorId = entity.assignedUserId ?? (await this.fallbackCreatorId(organizationId));
      if (!creatorId) return { type: action.type, status: 'FAILED', detail: 'No user available to attribute the task to.' };
      await this.prisma.task.create({
        data: {
          organizationId,
          clientId: entity.clientId,
          title: `${action.title}: ${entity.title}`,
          category: 'INTERNAL',
          assignedUserId: entity.assignedUserId ?? undefined,
          dueDate: entity.dueDate ?? undefined,
          createdByUserId: creatorId,
        },
      });
      return { type: action.type, status: 'SUCCESS' };
    }

    // SEND_EMAIL / SEND_WHATSAPP — never claim these were sent; no provider is wired.
    return { type: action.type, status: 'SKIPPED', detail: 'Provider not configured (Phase 2).' };
  }

  private async fallbackCreatorId(organizationId: string): Promise<string | null> {
    const admin = await this.prisma.user.findFirst({
      where: { organizationId, deletedAt: null, role: { key: 'FIRM_ADMIN' } },
      select: { id: true },
    });
    return admin?.id ?? null;
  }

  private async recordExecution(
    organizationId: string,
    automationRuleId: string,
    entity: EntityContext,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
    actionsSummary: unknown[],
    error?: string,
  ) {
    await this.prisma.automationExecution.create({
      data: {
        organizationId,
        automationRuleId,
        triggerEntityType: entity.entityType,
        triggerEntityId: entity.entityId,
        clientId: entity.clientId,
        status,
        actionsSummary: actionsSummary as Prisma.InputJsonValue,
        error,
        completedAt: new Date(),
      },
    });
  }
}
