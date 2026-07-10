import { describe, expect, it } from 'vitest';
import { addDaysIso, weeklyOccurrences } from '../date';

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
