import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';
import { DocumentRequestsService } from './document-requests.service.js';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto.js';
import { UpdateDocumentRequestDto } from './dto/update-document-request.dto.js';
import { ListDocumentRequestsDto } from './dto/list-document-requests.dto.js';
import { AddDocumentRequestItemDto } from './dto/add-item.dto.js';
import { FulfillDocumentRequestItemDto } from './dto/fulfill-item.dto.js';
import { ReviewDocumentRequestItemDto } from './dto/review-item.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('document-requests')
export class DocumentRequestsController {
  constructor(private readonly documentRequestsService: DocumentRequestsService) {}

  @RequirePermissions('document_requests.view')
  @Get('templates')
  getTemplates(@Query('category') category?: ServiceCategory) {
    return this.documentRequestsService.getTemplates(category);
  }

  @RequirePermissions('document_requests.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDocumentRequestsDto) {
    return this.documentRequestsService.list(user.organizationId, query);
  }

  @RequirePermissions('document_requests.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentRequestsService.get(user.organizationId, id);
  }

  @RequirePermissions('document_requests.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDocumentRequestDto) {
    return this.documentRequestsService.create(user, dto);
  }

  @RequirePermissions('document_requests.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDocumentRequestDto) {
    return this.documentRequestsService.update(user, id, dto);
  }

  @RequirePermissions('document_requests.manage')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentRequestsService.cancel(user, id);
  }

  @RequirePermissions('document_requests.manage')
  @Post(':id/items')
  addItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddDocumentRequestItemDto) {
    return this.documentRequestsService.addItem(user, id, dto);
  }

  @RequirePermissions('document_requests.manage')
  @Delete(':id/items/:itemId')
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.documentRequestsService.removeItem(user, id, itemId);
  }

  // Fulfilling (attaching a document) only requires upload rights — the
  // person collecting documents from a client isn't necessarily a manager.
  @RequirePermissions('documents.upload')
  @Post(':id/items/:itemId/fulfill')
  fulfillItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: FulfillDocumentRequestItemDto,
  ) {
    return this.documentRequestsService.fulfillItem(user, id, itemId, dto);
  }

  @RequirePermissions('document_requests.manage')
  @Patch(':id/items/:itemId/review')
  reviewItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: ReviewDocumentRequestItemDto,
  ) {
    return this.documentRequestsService.reviewItem(user, id, itemId, dto);
  }
}
