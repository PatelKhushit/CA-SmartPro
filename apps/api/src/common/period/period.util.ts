import type { TaskFrequency } from '@prisma/client';

/**
 * Pure period/due-date math for the recurring engine, kept deliberately
 * simple and unit-testable. Operates in UTC calendar terms.
 *
 * Convention: for periods longer than a month (QUARTERLY/HALF_YEARLY/YEARLY),
 * `dueDayOfPeriod` is the day-of-month within the LAST calendar month of that
 * period (e.g. a quarterly item with dueDayOfPeriod=15 is due on the 15th of
 * the quarter's final month). This is a calendar-quarter simplification —
 * Indian-FY-aware quarters (Apr–Jun, etc.) are a Phase 2 refinement.
 */

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function clampDay(year: number, monthIndex0: number, day: number): number {
  return Math.min(Math.max(day, 1), lastDayOfMonth(year, monthIndex0));
}

function isoWeek(date: Date): { isoYear: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { isoYear: d.getUTCFullYear(), week };
}

function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 1);
  return d;
}

export function getPeriodKey(frequency: TaskFrequency, ref: Date): string {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  switch (frequency) {
    case 'DAILY':
      return ref.toISOString().slice(0, 10);
    case 'WEEKLY': {
      const { isoYear, week } = isoWeek(ref);
      return `${isoYear}-W${String(week).padStart(2, '0')}`;
    }
    case 'MONTHLY':
      return `${y}-${String(m + 1).padStart(2, '0')}`;
    case 'QUARTERLY':
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case 'HALF_YEARLY':
      return `${y}-H${m < 6 ? 1 : 2}`;
    case 'YEARLY':
      return `${y}`;
    case 'ONE_TIME':
    default:
      throw new Error(`getPeriodKey is not applicable to frequency ${frequency}`);
  }
}

export function getDueDate(frequency: TaskFrequency, dueDayOfPeriod: number | null, ref: Date): Date {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const day = dueDayOfPeriod ?? 10;

  switch (frequency) {
    case 'DAILY':
      return new Date(Date.UTC(y, m, ref.getUTCDate()));
    case 'WEEKLY': {
      const start = startOfIsoWeek(ref);
      const weekday = Math.min(Math.max(dueDayOfPeriod ?? 5, 1), 7);
      const due = new Date(start);
      due.setUTCDate(start.getUTCDate() + (weekday - 1));
      return due;
    }
    case 'MONTHLY':
      return new Date(Date.UTC(y, m, clampDay(y, m, day)));
    case 'QUARTERLY': {
      const quarterEndMonth = Math.floor(m / 3) * 3 + 2; // last month index of the quarter
      return new Date(Date.UTC(y, quarterEndMonth, clampDay(y, quarterEndMonth, day)));
    }
    case 'HALF_YEARLY': {
      const halfEndMonth = m < 6 ? 5 : 11;
      return new Date(Date.UTC(y, halfEndMonth, clampDay(y, halfEndMonth, day)));
    }
    case 'YEARLY':
      return new Date(Date.UTC(y, 11, clampDay(y, 11, day)));
    case 'ONE_TIME':
    default:
      throw new Error(`getDueDate is not applicable to frequency ${frequency}`);
  }
}
