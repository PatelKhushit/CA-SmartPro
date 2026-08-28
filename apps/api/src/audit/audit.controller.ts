import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermissions('settings.manage')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('take') take?: string) {
    return this.prisma.auditLog.findMany({
      where: { organizationId: user.organizationId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: take ? Math.min(Number(take), 200) : 50,
    });
  }
}
