import { describe, expect, it } from 'vitest';
import {
  annualLeaveDays,
  isEligibleForHolidayPay,
  monthlyLeaveAccrual,
  recoveryPayAmount,
  recoveryPayDays,
  sickLeaveAccrual,
  sickPayForDay,
  totalSickPay,
} from '../rightsEngine';

describe('annualLeaveDays', () => {
  it('gives 12 days for years 1-4', () => {
    expect(annualLeaveDays(1)).toBe(12);
    expect(annualLeaveDays(4)).toBe(12);
  });

  it('treats less-than-a-year seniority as year 1', () => {
    expect(annualLeaveDays(0)).toBe(12);
    expect(annualLeaveDays(0.5)).toBe(12);
  });

  it('steps up at each named seniority year', () => {
    expect(annualLeaveDays(5)).toBe(14);
    expect(annualLeaveDays(6)).toBe(16);
    expect(annualLeaveDays(7)).toBe(18);
  });

  it('gives 19 days from year 8 onward', () => {
    expect(annualLeaveDays(8)).toBe(19);
    expect(annualLeaveDays(30)).toBe(19);
  });
});

describe('monthlyLeaveAccrual', () => {
  it('divides the annual entitlement by 12', () => {
    expect(monthlyLeaveAccrual(1)).toBeCloseTo(1, 5);
    expect(monthlyLeaveAccrual(6)).toBeCloseTo(16 / 12, 5);
  });
});

describe('sickLeaveAccrual', () => {
  it('accrues 1.5 days per month worked', () => {
    expect(sickLeaveAccrual(1)).toBeCloseTo(1.5, 5);
    expect(sickLeaveAccrual(4)).toBeCloseTo(6, 5);
  });

  it('caps accumulation at 90 days', () => {
    expect(sickLeaveAccrual(100)).toBe(90);
  });
});

describe('sickPayForDay / totalSickPay', () => {
  it('pays 0% on day 1', () => {
    expect(sickPayForDay(1, 400)).toBe(0);
  });

  it('pays 50% on days 2-3', () => {
    expect(sickPayForDay(2, 400)).toBe(200);
    expect(sickPayForDay(3, 400)).toBe(200);
  });

  it('pays 100% from day 4 onward', () => {
    expect(sickPayForDay(4, 400)).toBe(400);
    expect(sickPayForDay(10, 400)).toBe(400);
  });

  it('sums per-day pay across a multi-day sick leave', () => {
    // day1=0 + day2=200 + day3=200 + day4=400 = 800
    expect(totalSickPay(4, 400)).toBe(800);
  });
});

describe('recoveryPayDays', () => {
  it('gives 5 days for the first year', () => {
    expect(recoveryPayDays(0)).toBe(5);
    expect(recoveryPayDays(1)).toBe(5);
  });

  it('steps through each seniority band', () => {
    expect(recoveryPayDays(3)).toBe(6);
    expect(recoveryPayDays(10)).toBe(7);
    expect(recoveryPayDays(15)).toBe(8);
    expect(recoveryPayDays(19)).toBe(9);
    expect(recoveryPayDays(20)).toBe(10);
    expect(recoveryPayDays(40)).toBe(10);
  });
});

describe('recoveryPayAmount', () => {
  it('multiplies days by the daily rate for full-time employment', () => {
    // year 1 -> 5 days * 418
    expect(recoveryPayAmount(1, 1)).toBeCloseTo(5 * 418, 5);
  });

  it('prorates by employment fraction', () => {
    expect(recoveryPayAmount(1, 0.5)).toBeCloseTo(5 * 418 * 0.5, 5);
  });

  it('clamps employment fraction to [0, 1]', () => {
    expect(recoveryPayAmount(1, 2)).toBeCloseTo(5 * 418, 5);
    expect(recoveryPayAmount(1, -1)).toBe(0);
  });
});

describe('isEligibleForHolidayPay', () => {
  it('is not eligible before 3 months seniority', () => {
    expect(isEligibleForHolidayPay(2)).toBe(false);
  });

  it('is eligible from 3 months seniority', () => {
    expect(isEligibleForHolidayPay(3)).toBe(true);
    expect(isEligibleForHolidayPay(24)).toBe(true);
  });
});
