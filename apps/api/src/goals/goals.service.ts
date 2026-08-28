import { Injectable } from '@nestjs/common';
import { Prisma, type Goal } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { NotFoundApiError } from '../common/errors/api-error.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import type { CreateGoalDto } from './dto/create-goal.dto.js';

export interface GoalWithProgress extends Goal {
  currentValue: number;
  dataAvailable: boolean;
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<GoalWithProgress[]> {
    const goals = await this.prisma.goal.findMany({
      where: { organizationId: user.organizationId, OR: [{ userId: user.id }, { userId: null }] },
      orderBy: { periodStart: 'desc' },
    });
    return Promise.all(goals.map((goal) => this.attachProgress(goal)));
  }

  async create(user: AuthenticatedUser, dto: CreateGoalDto) {
    const goal = await this.prisma.goal.create({
      data: {
        organizationId: user.organizationId,
        userId: dto.personal === false ? null : user.id,
        type: dto.type,
        unit: dto.unit,
        targetValue: dto.targetValue,
        periodStart: new Date(dto.periodStart),
        periodEnd: new Date(dto.periodEnd),
      },
    });
    return this.attachProgress(goal);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!goal) throw new NotFoundApiError('GOAL_NOT_FOUND', 'This goal could not be found.');
    await this.prisma.goal.delete({ where: { id } });
    return { message: 'Goal removed.' };
  }

  /**
   * Progress is always computed live from tasks — never stored/duplicated,
   * so it can never go stale. COMPLIANCE and CLIENT_FOLLOW_UP goal types
   * are schema-ready but report dataAvailable:false until the Compliance
   * module (Phase 1, next) provides real data to compute against.
   */
  private async attachProgress(goal: Goal): Promise<GoalWithProgress> {
    if (goal.type === 'COMPLIANCE' || goal.type === 'CLIENT_FOLLOW_UP') {
      return { ...goal, currentValue: 0, dataAvailable: false };
    }

    const where: Prisma.TaskWhereInput = {
      organizationId: goal.organizationId,
      deletedAt: null,
      ...(goal.userId ? { assignedUserId: goal.userId } : {}),
      OR: [
        { status: 'COMPLETED', completedAt: { gte: goal.periodStart, lte: goal.periodEnd } },
        {
          status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
          dueDate: { gte: goal.periodStart, lte: goal.periodEnd },
        },
      ],
    };

    const [total, completed] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.count({
        where: {
          organizationId: goal.organizationId,
          deletedAt: null,
          ...(goal.userId ? { assignedUserId: goal.userId } : {}),
          status: 'COMPLETED',
          completedAt: { gte: goal.periodStart, lte: goal.periodEnd },
        },
      }),
    ]);

    const currentValue = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { ...goal, currentValue, dataAvailable: true };
  }
}
