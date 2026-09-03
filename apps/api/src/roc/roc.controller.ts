import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RocService } from './roc.service.js';
import {
  CreateFilingDocumentRequestDto,
  CreateFilingReminderDto,
  CreateFilingTaskDto,
  CreateRocFilingDto,
  ListRocFilingsDto,
  UpdateRocFilingDto,
} from './dto/roc-filing.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('roc')
export class RocController {
  constructor(private readonly rocService: RocService) {}

  @RequirePermissions('roc.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.rocService.summary(user.organizationId);
  }

  @RequirePermissions('roc.view')
  @Get('filings')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListRocFilingsDto) {
    return this.rocService.list(user.organizationId, query);
  }

  @RequirePermissions('roc.view')
  @Get('filings/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rocService.get(user.organizationId, id);
  }

  @RequirePermissions('roc.manage')
  @Post('filings')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRocFilingDto) {
    return this.rocService.create(user, dto);
  }

  @RequirePermissions('roc.manage')
  @Patch('filings/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRocFilingDto) {
    return this.rocService.update(user, id, dto);
  }

  @RequirePermissions('roc.manage')
  @Post('filings/:id/task')
  createTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateFilingTaskDto) {
    return this.rocService.createTaskForFiling(user, id, dto);
  }

  @RequirePermissions('roc.manage')
  @Post('filings/:id/reminder')
  createReminder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateFilingReminderDto) {
    return this.rocService.createReminderForFiling(user, id, dto);
  }

  @RequirePermissions('roc.manage')
  @Post('filings/:id/request-documents')
  requestDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateFilingDocumentRequestDto,
  ) {
    return this.rocService.requestDocumentsForFiling(user, id, dto);
  }
}
