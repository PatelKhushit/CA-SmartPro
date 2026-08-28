import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { getDueDate, getPeriodKey } from '../common/period/period.util.js';

export interface ComplianceGenerationSummary {
  rulesConsidered: number;
  eventsCreated: number;
  eventsSkippedExisting: number;
}

@Injectable()
export class ComplianceEngineService {
  private readonly logger = new Logger(ComplianceEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateAll(referenceDate: Date = new Date()): Promise<ComplianceGenerationSummary> {
    const orgs = await this.prisma.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    const totals: ComplianceGenerationSummary = { rulesConsidered: 0, eventsCreated: 0, eventsSkippedExisting: 0 };
    for (const org of orgs) {
      const result = await this.generateForOrganization(org.id, referenceDate);
      totals.rulesConsidered += result.rulesConsidered;
      totals.eventsCreated += result.eventsCreated;
      totals.eventsSkippedExisting += result.eventsSkippedExisting;
    }
    return totals;
  }

  async generateForOrganization(organizationId: string, referenceDate: Date = new Date()): Promise<ComplianceGenerationSummary> {
    const today = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));

    const rules = await this.prisma.complianceRule.findMany({
      where: {
        status: 'ACTIVE',
        effectiveFrom: { lte: today },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
      },
    });

    const summary: ComplianceGenerationSummary = { rulesConsidered: rules.length, eventsCreated: 0, eventsSkippedExisting: 0 };

    for (const rule of rules) {
      const periodKey = getPeriodKey(rule.frequency, today);
      const dueDate = getDueDate(rule.frequency, rule.dueDayOfPeriod, today);
      // Generate compliance events well ahead of due date (unlike tasks, these are calendar
      // deadlines the CA should see coming) — a fixed 60-day visibility window is a reasonable
      // MVP default rather than a per-rule leadDays knob.
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
      if (daysUntilDue > 60) continue;

      const category = rule.applicableServiceType ?? rule.category;
      const clients = await this.prisma.client.findMany({
        where: {
          organizationId,
          status: 'ACTIVE',
          deletedAt: null,
          services: { some: { category, status: 'ACTIVE' } },
        },
        select: { id: true },
      });

      for (const client of clients) {
        try {
          await this.prisma.complianceEvent.create({
            data: {
              organizationId,
              clientId: client.id,
              complianceRuleId: rule.id,
              periodKey,
              dueDate,
            },
          });
          summary.eventsCreated++;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            summary.eventsSkippedExisting++;
            continue;
          }
          this.logger.error(`Failed to generate compliance event for rule ${rule.id}: ${String(err)}`);
          throw err;
        }
      }
    }

    return summary;
  }

  /** Recomputes UPCOMING/DUE/OVERDUE status for all open events — called by the daily scheduler. */
  async refreshStatuses(referenceDate: Date = new Date()) {
    const today = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
    await this.prisma.complianceEvent.updateMany({
      where: { status: { in: ['UPCOMING', 'DUE'] }, dueDate: { lt: today } },
      data: { status: 'OVERDUE' },
    });
    await this.prisma.complianceEvent.updateMany({
      where: { status: 'UPCOMING', dueDate: { gte: today, lte: new Date(today.getTime() + 86_400_000) } },
      data: { status: 'DUE' },
    });
  }
}
