import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { RecurringEngineService } from '../tasks/recurring/recurring-engine.service.js';
import { ComplianceEngineService } from '../compliance/compliance-engine.service.js';
import { RemindersService } from './reminders.service.js';

@Injectable()
export class DailySchedulerService {
  private readonly logger = new Logger(DailySchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly recurringEngine: RecurringEngineService,
    private readonly complianceEngine: ComplianceEngineService,
    private readonly reminders: RemindersService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDaily() {
    await this.runForAllOrganizations();
  }

  async runForAllOrganizations() {
    const orgs = await this.prisma.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    for (const org of orgs) {
      await this.runForOrganization(org.id);
    }
  }

  async runForOrganization(organizationId: string) {
    this.logger.log(`Running daily ops for org ${organizationId}`);
    const tasks = await this.recurringEngine.generateForOrganization(organizationId);
    const compliance = await this.complianceEngine.generateForOrganization(organizationId);
    await this.complianceEngine.refreshStatuses();
    const reminders = await this.reminders.runForOrganization(organizationId);
    return { tasks, compliance, reminders };
  }
}
