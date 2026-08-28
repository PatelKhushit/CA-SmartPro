import type { TaskPriority, TaskStatus } from '@prisma/client';

export interface ScorableTask {
  id: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  createdAt: Date;
  estimatedMinutes: number | null;
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

/**
 * "Next Best Task" scoring (spec section 16). Considers due date proximity,
 * priority, overdue status, and task age. Client importance and task
 * dependencies are Phase 2 — there's no client-importance field or task
 * dependency graph yet, so those factors are intentionally omitted rather
 * than faked.
 */
export function computeTaskPriorityScore(task: ScorableTask, now: Date = new Date()): number {
  let score = PRIORITY_WEIGHT[task.priority] * 25;

  if (task.dueDate) {
    const daysUntilDue = Math.floor((task.dueDate.getTime() - now.getTime()) / 86_400_000);
    if (daysUntilDue < 0) {
      score += 100 + Math.min(-daysUntilDue, 30) * 2;
    } else if (daysUntilDue === 0) {
      score += 80;
    } else if (daysUntilDue <= 3) {
      score += 50;
    } else if (daysUntilDue <= 7) {
      score += 25;
    }
  }

  const ageDays = Math.floor((now.getTime() - task.createdAt.getTime()) / 86_400_000);
  score += Math.min(ageDays, 14);

  if (task.estimatedMinutes) {
    score -= Math.min(task.estimatedMinutes / 100, 5);
  }

  return score;
}

export function rankTasksByPriority<T extends ScorableTask>(tasks: T[], now: Date = new Date()): T[] {
  return [...tasks]
    .filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS')
    .sort((a, b) => computeTaskPriorityScore(b, now) - computeTaskPriorityScore(a, now));
}

export function getNextBestTask<T extends ScorableTask>(tasks: T[], now: Date = new Date()): T | null {
  const ranked = rankTasksByPriority(tasks, now);
  return ranked[0] ?? null;
}
