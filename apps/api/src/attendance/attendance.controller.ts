import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { ListAttendanceDto, MarkAttendanceDto, UpdateAttendanceDto } from './dto/attendance.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @RequirePermissions('attendance.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.summary(user.organizationId, user);
  }

  @RequirePermissions('attendance.view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAttendanceDto) {
    return this.attendanceService.list(user.organizationId, query);
  }

  @RequirePermissions('attendance.view')
  @Post('check-in')
  checkIn(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.checkIn(user);
  }

  @RequirePermissions('attendance.view')
  @Post('check-out')
  checkOut(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.checkOut(user);
  }

  @RequirePermissions('attendance.manage')
  @Post('mark')
  mark(@CurrentUser() user: AuthenticatedUser, @Body() dto: MarkAttendanceDto) {
    return this.attendanceService.mark(user, dto);
  }

  @RequirePermissions('attendance.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAttendanceDto) {
    return this.attendanceService.update(user, id, dto);
  }
}
