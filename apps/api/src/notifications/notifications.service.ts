import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { NotificationType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(user: AuthenticatedUser, unreadOnly?: boolean) {
    return this.prisma.notification.findMany({
      where: {
        organizationId: user.organizationId,
        userId: user.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  unreadCount(user: AuthenticatedUser) {
    return this.prisma.notification.count({
      where: { organizationId: user.organizationId, userId: user.id, isRead: false },
    });
  }

  async markRead(user: AuthenticatedUser, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, organizationId: user.organizationId, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'Marked read.' };
  }

  async markAllRead(user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: { organizationId: user.organizationId, userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { message: 'All marked read.' };
  }

  async getPreferences(user: AuthenticatedUser) {
    return this.prisma.notificationPreference.findMany({
      where: { organizationId: user.organizationId, userId: user.id },
    });
  }

  async setPreference(user: AuthenticatedUser, type: NotificationType, inAppEnabled: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { inAppEnabled },
      create: { organizationId: user.organizationId, userId: user.id, type, inAppEnabled },
    });
  }

  /** Internal helper used by other modules (task assignment, reminders) to raise a notification. */
  async notify(args: {
    organizationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
  }) {
    return this.prisma.notification.create({ data: args });
  }
}
