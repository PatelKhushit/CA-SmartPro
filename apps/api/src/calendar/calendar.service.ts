import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/create-calendar-event.dto.js';

export type UnifiedCalendarItemType = 'TASK' | 'COMPLIANCE' | 'CLIENT_MEETING' | 'INTERNAL_MEETING' | 'OTHER';

export interface UnifiedCalendarItem {
  id: string;
  sourceType: UnifiedCalendarItemType;
  sourceId: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  status: string;
  clientId: string | null;
  clientName: string | null;
}

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Merges manual calendar events, task due dates, and compliance due dates
   * into one read model — none of these are duplicated into a shared table,
   * avoiding stale copies (see spec section 5: "do not create unnecessary
   * duplicated data").
   */
  async getRange(organizationId: string, start: Date, end: Date): Promise<UnifiedCalendarItem[]> {
    const [manualEvents, tasks, complianceEvents] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: { organizationId, startAt: { gte: start, lte: end } },
        include: { client: { select: { id: true, displayName: true } } },
      }),
      this.prisma.task.findMany({
        where: { organizationId, deletedAt: null, dueDate: { gte: start, lte: end } },
        include: { client: { select: { id: true, displayName: true } } },
      }),
      this.prisma.complianceEvent.findMany({
        where: { organizationId, dueDate: { gte: start, lte: end } },
        include: { client: { select: { id: true, displayName: true } }, complianceRule: { select: { name: true } } },
      }),
    ]);

    const items: UnifiedCalendarItem[] = [];

    for (const e of manualEvents) {
      items.push({
        id: `event-${e.id}`,
        sourceType: e.type,
        sourceId: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt.toISOString(),
        allDay: e.allDay,
        status: 'UPCOMING',
        clientId: e.clientId,
        clientName: e.client?.displayName ?? null,
      });
    }

    for (const t of tasks) {
      if (!t.dueDate) continue;
      items.push({
        id: `task-${t.id}`,
        sourceType: 'TASK',
        sourceId: t.id,
        title: t.title,
        startAt: t.dueDate.toISOString(),
        endAt: t.dueDate.toISOString(),
        allDay: true,
        status: t.status,
        clientId: t.clientId,
        clientName: t.client?.displayName ?? null,
      });
    }

    for (const c of complianceEvents) {
      items.push({
        id: `compliance-${c.id}`,
        sourceType: 'COMPLIANCE',
        sourceId: c.id,
        title: c.complianceRule.name,
        startAt: c.dueDate.toISOString(),
        endAt: c.dueDate.toISOString(),
        allDay: true,
        status: c.status,
        clientId: c.clientId,
        clientName: c.client.displayName,
      });
    }

    return items.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async create(user: AuthenticatedUser, dto: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        organizationId: user.organizationId,
        createdByUserId: user.id,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        clientId: dto.clientId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        allDay: dto.allDay,
      },
    });
  }

  private async findOwned(organizationId: string, id: string) {
    const event = await this.prisma.calendarEvent.findFirst({ where: { id, organizationId } });
    if (!event) throw new NotFoundApiError('CALENDAR_EVENT_NOT_FOUND', 'This event could not be found.');
    return event;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCalendarEventDto) {
    await this.findOwned(user.organizationId, id);
    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    await this.findOwned(user.organizationId, id);
    await this.prisma.calendarEvent.delete({ where: { id } });
    return { message: 'Event removed.' };
  }
}
