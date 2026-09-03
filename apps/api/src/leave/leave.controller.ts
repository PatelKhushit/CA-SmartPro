import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { CreateLeaveRequestDto, ListLeaveRequestsDto, ReviewLeaveRequestDto } from './dto/leave-request.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @RequirePermissions('leave.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.leaveService.summary(user);
  }

  @RequirePermissions('leave.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListLeaveRequestsDto) {
    return this.leaveService.list(user, query);
  }

  @RequirePermissions('leave.view')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLeaveRequestDto) {
    return this.leaveService.create(user, dto);
  }

  @RequirePermissions('leave.view')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.leaveService.cancel(user, id);
  }

  @RequirePermissions('leave.manage')
  @Post(':id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReviewLeaveRequestDto) {
    return this.leaveService.approve(user, id, dto);
  }

  @RequirePermissions('leave.manage')
  @Post(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReviewLeaveRequestDto) {
    return this.leaveService.reject(user, id, dto);
  }
}
