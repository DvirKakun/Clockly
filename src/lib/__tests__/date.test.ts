import { describe, expect, it } from 'vitest';
import { addDaysIso, monthRange, stepMonth, weeklyOccurrences } from '../date';

describe('monthRange', () => {
  // These assertions are timezone-independent because monthRange builds boundaries in UTC.
  // Before that fix, a local-time Date + toISOString shifted both ends back a day in any
  // timezone ahead of UTC (e.g. Asia/Jerusalem gave 2026-06-30 .. 2026-07-30 for July).
  it('returns the exact calendar-month bounds', () => {
    expect(monthRange(2026, 6)).toEqual({ start: '2026-07-01', end: '2026-07-31' });
  });

  it('handles February in a non-leap year', () => {
    expect(monthRange(2026, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('handles December without rolling into the next year', () => {
    expect(monthRange(2026, 11)).toEqual({ start: '2026-12-01', end: '2026-12-31' });
  });
});

describe('addDaysIso', () => {
  it('adds days within the same month', () => {
    expect(addDaysIso('2026-07-10', 7)).toBe('2026-07-17');
  });

  it('rolls over a year boundary', () => {
    expect(addDaysIso('2026-12-28', 7)).toBe('2027-01-04');
  });

  it('rolls over a month boundary', () => {
    expect(addDaysIso('2026-02-25', 7)).toBe('2026-03-04');
  });
});

describe('weeklyOccurrences', () => {
  it('generates weekly dates inclusive of both endpoints', () => {
    expect(weeklyOccurrences('2026-07-10', '2026-08-07', 52)).toEqual([
      '2026-07-10',
      '2026-07-17',
      '2026-07-24',
      '2026-07-31',
      '2026-08-07',
    ]);
  });

  it('returns just the start date when start equals until', () => {
    expect(weeklyOccurrences('2026-07-10', '2026-07-10', 52)).toEqual(['2026-07-10']);
  });

  it('returns nothing when until is before start', () => {
    expect(weeklyOccurrences('2026-07-10', '2026-07-09', 52)).toEqual([]);
  });

  it('stops at maxCount + 1 so callers can detect overflow', () => {
    const result = weeklyOccurrences('2026-01-01', '2027-01-01', 3);
    expect(result).toHaveLength(4);
    expect(result.length).toBeGreaterThan(3);
  });
});

describe('stepMonth', () => {
  it('steps forward within a year', () => {
    expect(stepMonth(2026, 5, 1)).toEqual({ year: 2026, month: 6 });
  });

  it('steps back within a year', () => {
    expect(stepMonth(2026, 5, -1)).toEqual({ year: 2026, month: 4 });
  });

  it('rolls forward past December into the next January', () => {
    expect(stepMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('rolls back before January into the previous December', () => {
    expect(stepMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('steps by more than a year in either direction', () => {
    expect(stepMonth(2026, 0, 13)).toEqual({ year: 2027, month: 1 });
    expect(stepMonth(2026, 0, -13)).toEqual({ year: 2024, month: 11 });
  });

  it('is a no-op for a zero delta', () => {
    expect(stepMonth(2026, 7, 0)).toEqual({ year: 2026, month: 7 });
  });
});
