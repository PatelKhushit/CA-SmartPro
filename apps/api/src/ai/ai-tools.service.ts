import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

/**
 * Controlled, read-only backend tools the AI Copilot may call. Every method
 * takes organizationId (and userId where relevant) as an explicit parameter
 * supplied by the backend from the authenticated session — never from the
 * model's tool-call arguments — so the AI can never read another tenant's
 * data (spec section 31/32). Nothing here executes arbitrary SQL, and none
 * of these tools return client secrets (PAN/GSTIN/address) — just the
 * aggregate counts a CA would ask for.
 */
@Injectable()
export class AiToolsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTodayTasks(organizationId: string, userId: string) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        assignedUserId: userId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        OR: [{ dueDate: { lte: end } }, { dueDate: null }],
      },
      select: { title: true, priority: true, status: true, dueDate: true, client: { select: { displayName: true } } },
      take: 20,
    });
    if (tasks.length === 0) return { message: 'No tasks due today.' };
    return {
      tasks: tasks.map((t) => ({
        title: t.title,
        client: t.client?.displayName ?? 'Internal',
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }

  async getOverdueTasks(organizationId: string, userId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        assignedUserId: userId,
        deletedAt: null,
        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
        dueDate: { lt: start },
      },
      select: { title: true, priority: true, dueDate: true, client: { select: { displayName: true } } },
      take: 20,
    });
    if (tasks.length === 0) return { message: 'No overdue tasks.' };
    return {
      tasks: tasks.map((t) => ({
        title: t.title,
        client: t.client?.displayName ?? 'Internal',
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
      })),
    };
  }

  async getClientSummary(organizationId: string, clientName: string) {
    const client = await this.prisma.client.findFirst({
      where: { organizationId, deletedAt: null, displayName: { contains: clientName, mode: 'insensitive' } },
      select: { id: true, displayName: true, status: true },
    });
    if (!client) return { message: `Information not available. No client matching "${clientName}" was found.` };

    const [taskTotal, taskCompleted, taskOverdue, taskPending, complianceTotal, complianceCompleted, complianceOverdue, followUps] =
      await Promise.all([
        this.prisma.task.count({ where: { organizationId, clientId: client.id, deletedAt: null } }),
        this.prisma.task.count({ where: { organizationId, clientId: client.id, status: 'COMPLETED' } }),
        this.prisma.task.count({
          where: { organizationId, clientId: client.id, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: new Date() } },
        }),
        this.prisma.task.count({
          where: { organizationId, clientId: client.id, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] } },
        }),
        this.prisma.complianceEvent.count({ where: { organizationId, clientId: client.id } }),
        this.prisma.complianceEvent.count({ where: { organizationId, clientId: client.id, status: 'COMPLETED' } }),
        this.prisma.complianceEvent.count({ where: { organizationId, clientId: client.id, status: 'OVERDUE' } }),
        this.prisma.task.count({ where: { organizationId, clientId: client.id, category: 'FOLLOW_UP', deletedAt: null, status: { not: 'COMPLETED' } } }),
      ]);

    return {
      client: client.displayName,
      status: client.status,
      compliancePercent: complianceTotal === 0 ? null : Math.round((complianceCompleted / complianceTotal) * 100),
      complianceOverdue,
      tasksPending: taskPending,
      tasksOverdue: taskOverdue,
      tasksCompleted: taskCompleted,
      tasksTotal: taskTotal,
      followUpsPending: followUps,
      documentsPending: 'Information not available (documents module not yet built).',
      paymentsOutstanding: 'Information not available (payments module not yet built).',
    };
  }

  async getComplianceEvents(organizationId: string, status?: string, clientName?: string) {
    const events = await this.prisma.complianceEvent.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as never } : { status: { in: ['UPCOMING', 'DUE', 'OVERDUE'] } }),
        ...(clientName ? { client: { displayName: { contains: clientName, mode: 'insensitive' } } } : {}),
      },
      select: { dueDate: true, status: true, client: { select: { displayName: true } }, complianceRule: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });
    if (events.length === 0) return { message: 'No matching compliance items.' };
    return {
      events: events.map((e) => ({
        name: e.complianceRule.name,
        client: e.client.displayName,
        dueDate: e.dueDate.toISOString().slice(0, 10),
        status: e.status,
      })),
    };
  }
}
