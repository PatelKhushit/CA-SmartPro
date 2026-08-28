import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GoalsService } from './goals.service.js';
import { CreateGoalDto } from './dto/create-goal.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @RequirePermissions('goals.manage')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.goalsService.list(user);
  }

  @RequirePermissions('goals.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user, dto);
  }

  @RequirePermissions('goals.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.goalsService.remove(user, id);
  }
}
