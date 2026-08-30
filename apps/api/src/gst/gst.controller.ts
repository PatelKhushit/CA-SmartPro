import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { GstService } from './gst.service.js';
import { CreateGstProfileDto, UpdateGstProfileDto } from './dto/gst-profile.dto.js';
import {
  CreateGstReturnDto,
  CreateReturnDocumentRequestDto,
  CreateReturnReminderDto,
  CreateReturnTaskDto,
  ListGstReturnsDto,
  UpdateGstReturnDto,
} from './dto/gst-return.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('gst')
export class GstController {
  constructor(private readonly gstService: GstService) {}

  @RequirePermissions('gst.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.gstService.summary(user.organizationId);
  }

  @RequirePermissions('gst.view')
  @Get('profiles')
  listProfiles(@CurrentUser() user: AuthenticatedUser, @Query('clientId') clientId?: string) {
    return this.gstService.listProfiles(user.organizationId, clientId);
  }

  @RequirePermissions('gst.manage')
  @Post('profiles')
  createProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGstProfileDto) {
    return this.gstService.createProfile(user, dto);
  }

  @RequirePermissions('gst.manage')
  @Patch('profiles/:id')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateGstProfileDto) {
    return this.gstService.updateProfile(user, id, dto);
  }

  @RequirePermissions('gst.view')
  @Get('returns')
  listReturns(@CurrentUser() user: AuthenticatedUser, @Query() query: ListGstReturnsDto) {
    return this.gstService.listReturns(user.organizationId, query);
  }

  @RequirePermissions('gst.view')
  @Get('returns/:id')
  getReturn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gstService.getReturn(user.organizationId, id);
  }

  @RequirePermissions('gst.manage')
  @Post('returns')
  createReturn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGstReturnDto) {
    return this.gstService.createReturn(user, dto);
  }

  @RequirePermissions('gst.manage')
  @Patch('returns/:id')
  updateReturn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateGstReturnDto) {
    return this.gstService.updateReturn(user, id, dto);
  }

  @RequirePermissions('gst.manage')
  @Post('returns/:id/task')
  createTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateReturnTaskDto) {
    return this.gstService.createTaskForReturn(user, id, dto);
  }

  @RequirePermissions('gst.manage')
  @Post('returns/:id/reminder')
  createReminder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateReturnReminderDto) {
    return this.gstService.createReminderForReturn(user, id, dto);
  }

  @RequirePermissions('gst.manage')
  @Post('returns/:id/request-documents')
  requestDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReturnDocumentRequestDto,
  ) {
    return this.gstService.requestDocumentsForReturn(user, id, dto);
  }
}
