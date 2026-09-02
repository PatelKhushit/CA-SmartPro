import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { SearchQueryDto } from './dto/search-query.dto.js';

const RESULT_LIMIT = 5;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: AuthenticatedUser, query: SearchQueryDto) {
    const term = query.q.trim();
    if (!term) return { clients: [], tasks: [] };

    const organizationId = user.organizationId;
    const canViewClients = user.permissions.includes('clients.view');
    const canViewTasks = user.permissions.includes('tasks.view');

    const [clients, tasks] = await Promise.all([
      query.type === 'tasks' || !canViewClients
        ? Promise.resolve([])
        : this.prisma.client.findMany({
            where: {
              organizationId,
              deletedAt: null,
              OR: [
                { displayName: { contains: term, mode: 'insensitive' } },
                { legalName: { contains: term, mode: 'insensitive' } },
                { clientCode: { contains: term, mode: 'insensitive' } },
                { pan: { contains: term, mode: 'insensitive' } },
                { gstin: { contains: term, mode: 'insensitive' } },
              ],
            },
            select: { id: true, displayName: true, clientCode: true, pan: true, gstin: true },
            take: RESULT_LIMIT,
            orderBy: { displayName: 'asc' },
          }),
      query.type === 'clients' || !canViewTasks
        ? Promise.resolve([])
        : this.prisma.task.findMany({
            where: {
              organizationId,
              deletedAt: null,
              title: { contains: term, mode: 'insensitive' },
            },
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              client: { select: { displayName: true } },
            },
            take: RESULT_LIMIT,
            orderBy: { updatedAt: 'desc' },
          }),
    ]);

    return {
      clients: clients.map((c) => ({
        id: c.id,
        title: c.displayName,
        subtitle: c.pan ?? c.gstin ?? c.clientCode,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.client?.displayName ?? 'Internal',
        status: t.status,
        dueDate: t.dueDate,
      })),
    };
  }
}
