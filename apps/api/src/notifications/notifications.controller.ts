import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

class SetPreferenceDto {
  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsBoolean()
  inAppEnabled!: boolean;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @RequirePermissions('notifications.manage')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.list(user, unreadOnly === 'true');
  }

  @RequirePermissions('notifications.manage')
  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.unreadCount(user);
  }

  @RequirePermissions('notifications.manage')
  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user, id);
  }

  @RequirePermissions('notifications.manage')
  @Post('mark-all-read')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user);
  }

  @RequirePermissions('notifications.manage')
  @Get('preferences')
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user);
  }

  @RequirePermissions('notifications.manage')
  @Post('preferences')
  setPreference(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetPreferenceDto) {
    return this.notificationsService.setPreference(user, dto.type, dto.inAppEnabled);
  }
}
