import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service.js';
import { CreateKnowledgeDocumentDto, ListKnowledgeDocumentsDto, SearchKnowledgeDto, UpdateKnowledgeDocumentDto } from './dto/knowledge-document.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @RequirePermissions('knowledge.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListKnowledgeDocumentsDto) {
    return this.knowledgeService.list(user.organizationId, query);
  }

  @RequirePermissions('knowledge.view')
  @Get('search')
  search(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchKnowledgeDto) {
    return this.knowledgeService.search(user.organizationId, query.query, query.topK);
  }

  @RequirePermissions('knowledge.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.knowledgeService.get(user.organizationId, id);
  }

  @RequirePermissions('knowledge.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateKnowledgeDocumentDto) {
    return this.knowledgeService.create(user, dto);
  }

  @RequirePermissions('knowledge.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateKnowledgeDocumentDto) {
    return this.knowledgeService.update(user, id, dto);
  }

  @RequirePermissions('knowledge.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.knowledgeService.remove(user, id);
  }
}
