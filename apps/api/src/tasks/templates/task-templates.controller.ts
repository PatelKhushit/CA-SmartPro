import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TaskTemplatesService } from './task-templates.service.js';
import { CreateTaskTemplateDto } from './dto/create-task-template.dto.js';
import { UpdateTaskTemplateDto } from './dto/update-task-template.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface.js';

@Controller('task-templates')
export class TaskTemplatesController {
  constructor(private readonly templatesService: TaskTemplatesService) {}

  @RequirePermissions('tasks.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.templatesService.list(user.organizationId);
  }

  @RequirePermissions('tasks.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.templatesService.get(user.organizationId, id);
  }

  @RequirePermissions('task_templates.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskTemplateDto) {
    return this.templatesService.create(user, dto);
  }

  @RequirePermissions('task_templates.manage')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskTemplateDto,
  ) {
    return this.templatesService.update(user, id, dto);
  }

  @RequirePermissions('task_templates.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.templatesService.remove(user, id);
  }

  @RequirePermissions('task_templates.manage')
  @Post('generate-now')
  runNow(@CurrentUser() user: AuthenticatedUser) {
    return this.templatesService.runNow(user);
  }
}
