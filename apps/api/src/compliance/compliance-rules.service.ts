import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateComplianceRuleDto } from './dto/create-compliance-rule.dto.js';
import type { UpdateComplianceRuleDto } from './dto/update-compliance-rule.dto.js';

/**
 * Compliance rules are global (not organization-scoped) since GST/TDS/ROC
 * statutory deadlines are the same for every firm. No rules are seeded —
 * they're never invented; a Firm Admin enters them here with a mandatory
 * `source` citation, and can mark them verified once double-checked against
 * that source. See docs/STATUS.md.
 */
@Injectable()
export class ComplianceRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(status?: string) {
    return this.prisma.complianceRule.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  private async findOrThrow(id: string) {
    const rule = await this.prisma.complianceRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundApiError('COMPLIANCE_RULE_NOT_FOUND', 'This compliance rule could not be found.');
    return rule;
  }

  get(id: string) {
    return this.findOrThrow(id);
  }

  async create(user: AuthenticatedUser, dto: CreateComplianceRuleDto) {
    const rule = await this.prisma.complianceRule.create({
      data: {
        name: dto.name,
        category: dto.category,
        frequency: dto.frequency,
        description: dto.description,
        dueDayOfPeriod: dto.dueDayOfPeriod,
        applicableServiceType: dto.applicableServiceType,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        status: 'DRAFT',
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'compliance_rule_created',
      entityType: 'compliance_rule',
      entityId: rule.id,
      after: rule,
    });
    return rule;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateComplianceRuleDto) {
    const before = await this.findOrThrow(id);
    const rule = await this.prisma.complianceRule.update({
      where: { id },
      data: {
        ...dto,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'compliance_rule_updated',
      entityType: 'compliance_rule',
      entityId: id,
      before,
      after: rule,
    });
    return rule;
  }

  /** Marks a rule as verified against its cited source and activates it. Never automatic. */
  async verify(user: AuthenticatedUser, id: string) {
    const before = await this.findOrThrow(id);
    const rule = await this.prisma.complianceRule.update({
      where: { id },
      data: { verifiedAt: new Date(), status: 'ACTIVE' },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'compliance_rule_verified',
      entityType: 'compliance_rule',
      entityId: id,
      before,
      after: rule,
    });
    return rule;
  }

  async retire(user: AuthenticatedUser, id: string) {
    const before = await this.findOrThrow(id);
    const rule = await this.prisma.complianceRule.update({ where: { id }, data: { status: 'RETIRED' } });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'compliance_rule_retired',
      entityType: 'compliance_rule',
      entityId: id,
      before,
      after: rule,
    });
    return { message: 'Rule retired.' };
  }
}
