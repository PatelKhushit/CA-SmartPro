import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/create-calendar-event.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @RequirePermissions('calendar.manage')
  @Get()
  getRange(@CurrentUser() user: AuthenticatedUser, @Query('start') start?: string, @Query('end') end?: string) {
    if (!start || !end) {
      throw new BadRequestException('start and end query params are required (ISO dates).');
    }
    return this.calendarService.getRange(user.organizationId, new Date(start), new Date(end));
  }

  @RequirePermissions('calendar.manage')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.create(user, dto);
  }

  @RequirePermissions('calendar.manage')
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCalendarEventDto) {
    return this.calendarService.update(user, id, dto);
  }

  @RequirePermissions('calendar.manage')
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.calendarService.remove(user, id);
  }
}
