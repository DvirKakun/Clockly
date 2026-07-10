import { describe, expect, it } from 'vitest';
import { payPeriodRange, payPeriodRangeLabel } from '../payPeriod';

describe('payPeriodRange', () => {
  it('start day 1 is exactly the calendar month (backward compatible)', () => {
    expect(payPeriodRange(2026, 6, 1)).toEqual({ start: '2026-07-01', end: '2026-07-31' });
    // Non-leap February
    expect(payPeriodRange(2026, 1, 1)).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('shifts the window to [prev-month D .. this-month D-1] for start day > 1', () => {
    expect(payPeriodRange(2026, 6, 25)).toEqual({ start: '2026-06-25', end: '2026-07-24' });
    expect(payPeriodRange(2026, 1, 15)).toEqual({ start: '2026-01-15', end: '2026-02-14' });
  });

  it('rolls the start back across a year boundary (January period)', () => {
    expect(payPeriodRange(2026, 0, 25)).toEqual({ start: '2025-12-25', end: '2026-01-24' });
  });

  it('rolls the end forward across a year boundary (December period)', () => {
    expect(payPeriodRange(2026, 11, 28)).toEqual({ start: '2026-11-28', end: '2026-12-27' });
  });

  it('treats 0 or negative start day as calendar month too (defensive)', () => {
    expect(payPeriodRange(2026, 6, 0)).toEqual(payPeriodRange(2026, 6, 1));
  });
});

describe('payPeriodRangeLabel', () => {
  it('formats a compact day.month – day.month range', () => {
    expect(payPeriodRangeLabel({ start: '2026-06-25', end: '2026-07-24' })).toBe('25.6 – 24.7');
  });
});
