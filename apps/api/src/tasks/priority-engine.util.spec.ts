import { describe, expect, it } from 'vitest';
import { computeTaskPriorityScore, getNextBestTask, rankTasksByPriority, type ScorableTask } from './priority-engine.util.js';

const now = new Date('2026-08-27T12:00:00.000Z');

function task(overrides: Partial<ScorableTask>): ScorableTask {
  return {
    id: 'id',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: null,
    createdAt: now,
    estimatedMinutes: null,
    ...overrides,
  };
}

describe('priority-engine.util', () => {
  it('scores an overdue URGENT task higher than a not-yet-due LOW task', () => {
    const overdue = task({ priority: 'URGENT', dueDate: new Date('2026-08-20T00:00:00.000Z') });
    const future = task({ priority: 'LOW', dueDate: new Date('2026-09-15T00:00:00.000Z') });
    expect(computeTaskPriorityScore(overdue, now)).toBeGreaterThan(computeTaskPriorityScore(future, now));
  });

  it('scores a task due today higher than a task due in a week, at equal priority', () => {
    const dueToday = task({ priority: 'MEDIUM', dueDate: new Date('2026-08-27T00:00:00.000Z') });
    const dueNextWeek = task({ priority: 'MEDIUM', dueDate: new Date('2026-09-05T00:00:00.000Z') });
    expect(computeTaskPriorityScore(dueToday, now)).toBeGreaterThan(computeTaskPriorityScore(dueNextWeek, now));
  });

  it('excludes completed and cancelled tasks from ranking', () => {
    const tasks = [
      task({ id: 'a', status: 'COMPLETED' }),
      task({ id: 'b', status: 'CANCELLED' }),
      task({ id: 'c', status: 'PENDING' }),
    ];
    const ranked = rankTasksByPriority(tasks, now);
    expect(ranked.map((t) => t.id)).toEqual(['c']);
  });

  it('returns null next-best-task when nothing is actionable', () => {
    const tasks = [task({ status: 'COMPLETED' })];
    expect(getNextBestTask(tasks, now)).toBeNull();
  });

  it('picks the highest-scoring task as next best', () => {
    const low = task({ id: 'low', priority: 'LOW' });
    const urgent = task({ id: 'urgent', priority: 'URGENT', dueDate: new Date('2026-08-20T00:00:00.000Z') });
    const next = getNextBestTask([low, urgent], now);
    expect(next?.id).toBe('urgent');
  });
});
