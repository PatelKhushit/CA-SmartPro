import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { NoticesService } from './notices.service.js';
import { CreateNoticeDto } from './dto/create-notice.dto.js';
import { UpdateNoticeDto } from './dto/update-notice.dto.js';
import { ListNoticesDto } from './dto/list-notices.dto.js';
import { AddNoticeCommentDto, CreateNoticeTaskDto, LinkNoticeDocumentDto } from './dto/misc.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @RequirePermissions('notices.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.noticesService.summary(user.organizationId);
  }

  @RequirePermissions('notices.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNoticesDto) {
    return this.noticesService.list(user.organizationId, query);
  }

  @RequirePermissions('notices.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.noticesService.get(user.organizationId, id);
  }

  @RequirePermissions('notices.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNoticeDto) {
    return this.noticesService.create(user, dto);
  }

  @RequirePermissions('notices.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticesService.update(user, id, dto);
  }

  @RequirePermissions('notices.manage')
  @Post(':id/comments')
  addComment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddNoticeCommentDto) {
    return this.noticesService.addComment(user, id, dto);
  }

  @RequirePermissions('notices.manage')
  @Post(':id/documents')
  linkDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LinkNoticeDocumentDto) {
    return this.noticesService.linkDocument(user, id, dto);
  }

  @RequirePermissions('notices.manage')
  @Delete(':id/documents/:documentId')
  unlinkDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.noticesService.unlinkDocument(user, id, documentId);
  }

  @RequirePermissions('notices.manage')
  @Post(':id/tasks')
  createTask(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateNoticeTaskDto) {
    return this.noticesService.createTask(user, id, dto);
  }
}
