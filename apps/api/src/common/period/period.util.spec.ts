import { describe, expect, it } from 'vitest';
import { getDueDate, getPeriodKey } from './period.util.js';

describe('period.util', () => {
  describe('getPeriodKey', () => {
    it('formats a monthly period key', () => {
      expect(getPeriodKey('MONTHLY', new Date(Date.UTC(2026, 7, 27)))).toBe('2026-08');
    });

    it('formats a quarterly period key', () => {
      expect(getPeriodKey('QUARTERLY', new Date(Date.UTC(2026, 7, 27)))).toBe('2026-Q3');
      expect(getPeriodKey('QUARTERLY', new Date(Date.UTC(2026, 0, 15)))).toBe('2026-Q1');
    });

    it('formats a half-yearly period key', () => {
      expect(getPeriodKey('HALF_YEARLY', new Date(Date.UTC(2026, 2, 1)))).toBe('2026-H1');
      expect(getPeriodKey('HALF_YEARLY', new Date(Date.UTC(2026, 8, 1)))).toBe('2026-H2');
    });

    it('formats a yearly period key', () => {
      expect(getPeriodKey('YEARLY', new Date(Date.UTC(2026, 5, 1)))).toBe('2026');
    });

    it('formats a daily period key as an ISO date', () => {
      expect(getPeriodKey('DAILY', new Date(Date.UTC(2026, 7, 27)))).toBe('2026-08-27');
    });

    it('throws for ONE_TIME frequency', () => {
      expect(() => getPeriodKey('ONE_TIME', new Date())).toThrow();
    });
  });

  describe('getDueDate', () => {
    it('computes a monthly due date on the given day', () => {
      const due = getDueDate('MONTHLY', 20, new Date(Date.UTC(2026, 7, 1)));
      expect(due.toISOString().slice(0, 10)).toBe('2026-08-20');
    });

    it('clamps to the last day of a short month', () => {
      const due = getDueDate('MONTHLY', 31, new Date(Date.UTC(2026, 1, 5))); // February 2026 (not a leap year)
      expect(due.toISOString().slice(0, 10)).toBe('2026-02-28');
    });

    it('computes a quarterly due date in the last month of the quarter', () => {
      const due = getDueDate('QUARTERLY', 15, new Date(Date.UTC(2026, 3, 10))); // Q2: Apr-Jun
      expect(due.toISOString().slice(0, 10)).toBe('2026-06-15');
    });

    it('defaults to day 10 when dueDayOfPeriod is null', () => {
      const due = getDueDate('MONTHLY', null, new Date(Date.UTC(2026, 7, 1)));
      expect(due.toISOString().slice(0, 10)).toBe('2026-08-10');
    });
  });
});
