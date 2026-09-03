import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ItrService } from './itr.service.js';
import {
  CreateItrReturnDto,
  CreateReturnDocumentRequestDto,
  CreateReturnReminderDto,
  CreateReturnTaskDto,
  ListItrReturnsDto,
  UpdateItrReturnDto,
} from './dto/itr-return.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('itr')
export class ItrController {
  constructor(private readonly itrService: ItrService) {}

  @RequirePermissions('itr.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.itrService.summary(user.organizationId);
  }

  @RequirePermissions('itr.view')
  @Get('returns')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListItrReturnsDto) {
    return this.itrService.list(user.organizationId, query);
  }

  @RequirePermissions('itr.view')
  @Get('returns/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.itrService.get(user.organizationId, id);
  }

  @RequirePermissions('itr.manage')
  @Post('returns')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateItrReturnDto) {
    return this.itrService.create(user, dto);
  }

  @RequirePermissions('itr.manage')
  @Patch('returns/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateItrReturnDto) {
    return this.itrService.update(user, id, dto);
  }

  @RequirePermissions('itr.manage')
  @Post('returns/:id/task')
  createTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateReturnTaskDto) {
    return this.itrService.createTaskForReturn(user, id, dto);
  }

  @RequirePermissions('itr.manage')
  @Post('returns/:id/reminder')
  createReminder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateReturnReminderDto) {
    return this.itrService.createReminderForReturn(user, id, dto);
  }

  @RequirePermissions('itr.manage')
  @Post('returns/:id/request-documents')
  requestDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReturnDocumentRequestDto,
  ) {
    return this.itrService.requestDocumentsForReturn(user, id, dto);
  }
}
