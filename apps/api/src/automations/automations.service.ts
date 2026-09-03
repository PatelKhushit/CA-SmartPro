import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateAutomationRuleDto, UpdateAutomationRuleDto } from './dto/automation-rule.dto.js';

@Injectable()
export class AutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(organizationId: string) {
    return this.prisma.automationRule.findMany({
      where: { organizationId },
      include: { createdBy: { select: { id: true, fullName: true } }, _count: { select: { executions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOwned(organizationId: string, id: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, organizationId } });
    if (!rule) throw new NotFoundApiError('AUTOMATION_NOT_FOUND', 'This automation could not be found.');
    return rule;
  }

  async get(organizationId: string, id: string) {
    return this.findOwned(organizationId, id);
  }

  async create(user: AuthenticatedUser, dto: CreateAutomationRuleDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      const rule = await tx.automationRule.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name,
          description: dto.description,
          triggerType: dto.triggerType,
          triggerConfig: (dto.triggerConfig ?? {}) as Prisma.InputJsonValue,
          conditions: (dto.conditions ?? []) as Prisma.InputJsonValue,
          actions: dto.actions as Prisma.InputJsonValue,
          createdByUserId: user.id,
        },
      });
      await this.audit.log(
        {
          organizationId: user.organizationId,
          userId: user.id,
          action: 'automation_rule_created',
          entityType: 'automation_rule',
          entityId: rule.id,
          after: rule,
          metadata: { name: rule.name, triggerType: rule.triggerType },
        },
        tx,
      );
      return rule;
    });
    return created;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateAutomationRuleDto) {
    await this.findOwned(user.organizationId, id);
    return this.prisma.automationRule.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        triggerConfig: dto.triggerConfig as Prisma.InputJsonValue | undefined,
        conditions: dto.conditions as Prisma.InputJsonValue | undefined,
        actions: dto.actions as Prisma.InputJsonValue | undefined,
        isEnabled: dto.isEnabled,
      },
    });
  }

  async setEnabled(user: AuthenticatedUser, id: string, isEnabled: boolean) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.automationRule.update({ where: { id }, data: { isEnabled } });
    return { message: isEnabled ? 'Automation enabled.' : 'Automation paused.' };
  }

  async listExecutions(organizationId: string, ruleId?: string) {
    const executions = await this.prisma.automationExecution.findMany({
      where: { organizationId, ...(ruleId ? { automationRuleId: ruleId } : {}) },
      include: { automationRule: { select: { id: true, name: true } } },
      orderBy: { triggeredAt: 'desc' },
      take: 200,
    });

    // clientId is a denormalized scalar (not a FK relation) so a single
    // batched lookup fills in the display name without a per-row join.
    const clientIds = [...new Set(executions.map((e) => e.clientId).filter((id): id is string => !!id))];
    const clients = clientIds.length
      ? await this.prisma.client.findMany({ where: { id: { in: clientIds }, organizationId }, select: { id: true, displayName: true } })
      : [];
    const clientNameById = new Map(clients.map((c) => [c.id, c.displayName]));

    return executions.map((e) => ({ ...e, clientName: e.clientId ? (clientNameById.get(e.clientId) ?? null) : null }));
  }
}
