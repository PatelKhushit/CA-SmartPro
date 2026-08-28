import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async daily(organizationId: string, dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const start = startOfDay(date);
    const end = endOfDay(date);

    const [completed, pending, overdue, followUps, tasks] = await Promise.all([
      this.prisma.task.count({
        where: { organizationId, status: 'COMPLETED', completedAt: { gte: start, lte: end } },
      }),
      this.prisma.task.count({
        where: { organizationId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { gte: start, lte: end } },
      }),
      this.prisma.task.count({
        where: { organizationId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: start } },
      }),
      this.prisma.task.count({
        where: { organizationId, deletedAt: null, category: 'FOLLOW_UP', dueDate: { gte: start, lte: end } },
      }),
      this.prisma.task.findMany({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { status: 'COMPLETED', completedAt: { gte: start, lte: end } },
            { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { gte: start, lte: end } },
          ],
        },
        include: {
          client: { select: { displayName: true } },
          assignedUser: { select: { fullName: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return { date: start.toISOString().slice(0, 10), completed, pending, overdue, followUps, tasks };
  }

  async monthly(organizationId: string, monthStr?: string) {
    const ref = monthStr ? new Date(`${monthStr}-01`) : new Date();
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);

    const [completed, totalDue, complianceCompleted, complianceTotal, activeClients] = await Promise.all([
      this.prisma.task.count({ where: { organizationId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
      this.prisma.task.count({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { status: 'COMPLETED', completedAt: { gte: start, lte: end } },
            { status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { gte: start, lte: end } },
          ],
        },
      }),
      this.prisma.complianceEvent.count({ where: { organizationId, status: 'COMPLETED', completedAt: { gte: start, lte: end } } }),
      this.prisma.complianceEvent.count({ where: { organizationId, dueDate: { gte: start, lte: end } } }),
      this.prisma.client.count({ where: { organizationId, status: 'ACTIVE', deletedAt: null } }),
    ]);

    return {
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      productivityPercent: totalDue === 0 ? 0 : Math.round((completed / totalDue) * 100),
      complianceHealthPercent: complianceTotal === 0 ? 0 : Math.round((complianceCompleted / complianceTotal) * 100),
      tasksCompleted: completed,
      tasksTotal: totalDue,
      complianceCompleted,
      complianceTotal,
      activeClients,
    };
  }

  async team(organizationId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizationId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, fullName: true, role: { select: { name: true } } },
    });

    const rows = await Promise.all(
      users.map(async (user) => {
        const [assigned, completed, overdue] = await Promise.all([
          this.prisma.task.count({ where: { organizationId, assignedUserId: user.id, deletedAt: null } }),
          this.prisma.task.count({ where: { organizationId, assignedUserId: user.id, status: 'COMPLETED' } }),
          this.prisma.task.count({
            where: {
              organizationId,
              assignedUserId: user.id,
              deletedAt: null,
              status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
              dueDate: { lt: startOfDay(new Date()) },
            },
          }),
        ]);
        return {
          userId: user.id,
          fullName: user.fullName,
          role: user.role.name,
          assigned,
          completed,
          overdue,
          completionRate: assigned === 0 ? 0 : Math.round((completed / assigned) * 100),
        };
      }),
    );

    return rows;
  }

  async client(organizationId: string, clientId: string) {
    const [taskTotal, taskCompleted, taskOverdue, complianceTotal, complianceCompleted, complianceOverdue] = await Promise.all([
      this.prisma.task.count({ where: { organizationId, clientId, deletedAt: null } }),
      this.prisma.task.count({ where: { organizationId, clientId, status: 'COMPLETED' } }),
      this.prisma.task.count({
        where: { organizationId, clientId, deletedAt: null, status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: startOfDay(new Date()) } },
      }),
      this.prisma.complianceEvent.count({ where: { organizationId, clientId } }),
      this.prisma.complianceEvent.count({ where: { organizationId, clientId, status: 'COMPLETED' } }),
      this.prisma.complianceEvent.count({ where: { organizationId, clientId, status: 'OVERDUE' } }),
    ]);

    return {
      tasks: { total: taskTotal, completed: taskCompleted, overdue: taskOverdue },
      compliance: {
        total: complianceTotal,
        completed: complianceCompleted,
        overdue: complianceOverdue,
        healthPercent: complianceTotal === 0 ? 100 : Math.round((complianceCompleted / complianceTotal) * 100),
      },
      // Documents and payments reports are Phase 2 — those modules don't exist yet.
    };
  }

  async dailyCsv(organizationId: string, dateStr?: string): Promise<string> {
    const report = await this.daily(organizationId, dateStr);
    const header = 'Title,Client,Assigned To,Priority,Status,Due Date\n';
    const rows = report.tasks
      .map((t) =>
        [t.title, t.client?.displayName ?? 'Internal', t.assignedUser?.fullName ?? 'Unassigned', t.priority, t.status, t.dueDate?.toISOString().slice(0, 10) ?? '']
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');
    return header + rows;
  }
}
