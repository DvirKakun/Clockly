import { describe, expect, it } from 'vitest';
import { getMonthGridDays } from '../calendarGrid';

describe('getMonthGridDays', () => {
  it('returns a length that is always a multiple of 7', () => {
    for (let month = 0; month < 12; month++) {
      const days = getMonthGridDays(2026, month);
      expect(days.length % 7).toBe(0);
    }
  });

  it('pads leading days so the grid starts on a Sunday', () => {
    // July 2026: the 1st is a Wednesday (dow=3), so 3 leading days from June are expected.
    const days = getMonthGridDays(2026, 6);
    const leading = days.filter((d) => !d.isCurrentMonth && d.iso < '2026-07-01');
    expect(leading).toHaveLength(3);
    expect(leading[0].iso).toBe('2026-06-28');
    expect(leading[2].iso).toBe('2026-06-30');
  });

  it('includes every day of the current month exactly once, marked isCurrentMonth', () => {
    const days = getMonthGridDays(2026, 6); // July has 31 days
    const current = days.filter((d) => d.isCurrentMonth);
    expect(current).toHaveLength(31);
    expect(current[0].iso).toBe('2026-07-01');
    expect(current[30].iso).toBe('2026-07-31');
  });

  it('pads trailing days from the next month to complete the last week', () => {
    const days = getMonthGridDays(2026, 6);
    const trailing = days.filter((d) => !d.isCurrentMonth && d.iso > '2026-07-31');
    expect(trailing.length).toBeGreaterThan(0);
    expect(trailing[0].iso).toBe('2026-08-01');
  });

  it('handles a month that starts on Sunday with zero leading padding', () => {
    // February 2026: the 1st is a Sunday.
    const days = getMonthGridDays(2026, 1);
    expect(days[0].iso).toBe('2026-02-01');
    expect(days[0].isCurrentMonth).toBe(true);
  });

  it('handles February in a non-leap year (28 days) and rolls year boundaries correctly', () => {
    const days = getMonthGridDays(2026, 1);
    const current = days.filter((d) => d.isCurrentMonth);
    expect(current).toHaveLength(28);

    // December -> January year rollover
    const dec = getMonthGridDays(2026, 11);
    const decCurrent = dec.filter((d) => d.isCurrentMonth);
    expect(decCurrent[0].iso).toBe('2026-12-01');
    expect(decCurrent[decCurrent.length - 1].iso).toBe('2026-12-31');
    const janTrailing = dec.filter((d) => !d.isCurrentMonth && d.iso >= '2027-01-01');
    if (janTrailing.length > 0) {
      expect(janTrailing[0].iso).toBe('2027-01-01');
    }
  });
});
