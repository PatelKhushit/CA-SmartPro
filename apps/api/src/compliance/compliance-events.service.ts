import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Injectable()
export class ComplianceEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(
    organizationId: string,
    filters: { clientId?: string; status?: string; dueBefore?: string; dueAfter?: string },
  ) {
    const where: Prisma.ComplianceEventWhereInput = {
      organizationId,
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.dueBefore || filters.dueAfter
        ? {
            dueDate: {
              ...(filters.dueBefore ? { lte: new Date(filters.dueBefore) } : {}),
              ...(filters.dueAfter ? { gte: new Date(filters.dueAfter) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.complianceEvent.findMany({
      where,
      include: {
        client: { select: { id: true, displayName: true, clientCode: true } },
        complianceRule: { select: { id: true, name: true, category: true, source: true, sourceUrl: true, verifiedAt: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async complete(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.complianceEvent.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!event) throw new NotFoundApiError('COMPLIANCE_EVENT_NOT_FOUND', 'This compliance item could not be found.');
    const updated = await this.prisma.complianceEvent.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'compliance_event_completed',
      entityType: 'compliance_event',
      entityId: id,
      before: event,
      after: updated,
    });
    return updated;
  }

  async waive(user: AuthenticatedUser, id: string) {
    const event = await this.prisma.complianceEvent.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!event) throw new NotFoundApiError('COMPLIANCE_EVENT_NOT_FOUND', 'This compliance item could not be found.');
    return this.prisma.complianceEvent.update({ where: { id }, data: { status: 'WAIVED' } });
  }
}
