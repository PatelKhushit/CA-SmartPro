import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ListTasksDto } from './dto/list-tasks.dto.js';
import { AddCommentDto, AssignTaskDto, RescheduleTaskDto } from './dto/misc.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @RequirePermissions('tasks.view')
  @Get('my-day')
  myDay(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getMyDay(user);
  }

  @RequirePermissions('tasks.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTasksDto) {
    return this.tasksService.list(user.organizationId, query);
  }

  @RequirePermissions('tasks.view')
  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasksService.get(user.organizationId, id);
  }

  @RequirePermissions('tasks.create')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user, dto);
  }

  @RequirePermissions('tasks.edit')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(user, id, dto);
  }

  @RequirePermissions('tasks.assign')
  @Post(':id/assign')
  assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignTaskDto) {
    return this.tasksService.assign(user, id, dto);
  }

  @RequirePermissions('tasks.complete')
  @Post(':id/complete')
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasksService.complete(user, id);
  }

  @RequirePermissions('tasks.edit')
  @Post(':id/reschedule')
  reschedule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RescheduleTaskDto,
  ) {
    return this.tasksService.reschedule(user, id, dto);
  }

  @RequirePermissions('tasks.delete')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasksService.remove(user, id);
  }

  @RequirePermissions('tasks.edit')
  @Post(':id/checklist/:itemId/toggle')
  toggleChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.tasksService.toggleChecklistItem(user, id, itemId);
  }

  @RequirePermissions('tasks.edit')
  @Post(':id/comments')
  addComment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddCommentDto) {
    return this.tasksService.addComment(user, id, dto);
  }
}
