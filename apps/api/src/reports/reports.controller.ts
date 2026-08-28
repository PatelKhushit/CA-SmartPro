import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @RequirePermissions('reports.view')
  @Get('daily')
  daily(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.reportsService.daily(user.organizationId, date);
  }

  @RequirePermissions('reports.view')
  @Get('daily/export.csv')
  async dailyCsv(@CurrentUser() user: AuthenticatedUser, @Res() res: Response, @Query('date') date?: string) {
    const csv = await this.reportsService.dailyCsv(user.organizationId, date);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="daily-report-${date ?? 'today'}.csv"`);
    res.send(csv);
  }

  @RequirePermissions('reports.view')
  @Get('monthly')
  monthly(@CurrentUser() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.reportsService.monthly(user.organizationId, month);
  }

  @RequirePermissions('reports.view')
  @Get('team')
  team(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.team(user.organizationId);
  }

  @RequirePermissions('reports.view')
  @Get('client/:clientId')
  client(@CurrentUser() user: AuthenticatedUser, @Param('clientId') clientId: string) {
    return this.reportsService.client(user.organizationId, clientId);
  }
}
