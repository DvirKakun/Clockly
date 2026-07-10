import { describe, expect, it } from 'vitest';
import { computeShiftGross, computeShiftHours, computeMonthlyGross } from '../grossEngine';
import type { RateProfile, ShiftInput } from '../types';

const hourlyProfile: RateProfile = {
  employmentType: 'hourly',
  hourlyRate: 40,
  standardWeeklyHours: 42,
  workDaysPerWeek: 5,
};

function shift(overrides: Partial<ShiftInput>): ShiftInput {
  return {
    id: 's1',
    date: '2026-07-01',
    startTime: '09:00',
    endTime: '17:00',
    crossesMidnight: false,
    dayType: 'regular',
    breaks: [],
    ...overrides,
  };
}

describe('computeShiftHours', () => {
  it('computes a standard 8-hour day with no overtime (under 8.6h threshold)', () => {
    const h = computeShiftHours(shift({ startTime: '09:00', endTime: '17:00' }), hourlyProfile);
    expect(h.payableHours).toBe(8);
    expect(h.regularHours).toBe(8);
    expect(h.overtime125Hours).toBe(0);
    expect(h.overtime150Hours).toBe(0);
  });

  it('splits overtime into 125% (first 2h) and 150% (beyond) tiers', () => {
    // 8.6 standard + 2h @125% + 1h @150% = 11.6h shift
    const h = computeShiftHours(shift({ startTime: '08:00', endTime: '19:36' }), hourlyProfile);
    expect(h.payableHours).toBeCloseTo(11.6, 5);
    expect(h.regularHours).toBeCloseTo(8.6, 5);
    expect(h.overtime125Hours).toBeCloseTo(2, 5);
    expect(h.overtime150Hours).toBeCloseTo(1, 5);
  });

  it('handles a shift that crosses midnight', () => {
    const h = computeShiftHours(
      shift({ startTime: '22:00', endTime: '06:00', crossesMidnight: true }),
      hourlyProfile
    );
    expect(h.totalHours).toBe(8);
    expect(h.isNightShift).toBe(true);
    // night shift standard day is 7h -> 1h overtime at 125%
    expect(h.regularHours).toBe(7);
    expect(h.overtime125Hours).toBe(1);
  });

  it('detects night shift when >=2h overlap with 22:00-06:00 window', () => {
    const h = computeShiftHours(shift({ startTime: '20:00', endTime: '00:30', crossesMidnight: true }), hourlyProfile);
    expect(h.isNightShift).toBe(true); // 2.5h overlap (22:00-00:30)
  });

  it('does not flag night shift for <2h overlap', () => {
    const h = computeShiftHours(shift({ startTime: '20:00', endTime: '22:30' }), hourlyProfile);
    expect(h.isNightShift).toBe(false);
  });

  it('excludes unpaid break time from payable hours but keeps paid break time', () => {
    const h = computeShiftHours(
      shift({
        startTime: '09:00',
        endTime: '18:00',
        breaks: [{ startTime: '13:00', endTime: '13:30', isPaid: false }],
      }),
      hourlyProfile
    );
    expect(h.totalHours).toBe(9);
    expect(h.unpaidBreakHours).toBe(0.5);
    expect(h.payableHours).toBe(8.5);
  });

  it('computes shabbat hours at 150% base then 175%/200% overtime tiers', () => {
    const h = computeShiftHours(
      shift({ startTime: '08:00', endTime: '19:00', dayType: 'shabbat' }),
      hourlyProfile
    );
    expect(h.payableHours).toBe(11);
    expect(h.shabbatBaseHours).toBeCloseTo(8.6, 5);
    expect(h.shabbatOvertime175Hours).toBeCloseTo(2, 5);
    expect(h.shabbatOvertime200Hours).toBeCloseTo(0.4, 5);
  });
});

describe('computeShiftGross', () => {
  it('pays regular + overtime at correct multipliers', () => {
    const g = computeShiftGross(shift({ startTime: '08:00', endTime: '19:36' }), hourlyProfile);
    expect(g.regularPay).toBeCloseTo(8.6 * 40, 5);
    expect(g.overtime125Pay).toBeCloseTo(2 * 40 * 1.25, 5);
    expect(g.overtime150Pay).toBeCloseTo(1 * 40 * 1.5, 5);
  });

  it('caps travel reimbursement at the daily cap', () => {
    const g = computeShiftGross(shift({ travelReimbursement: 50 }), hourlyProfile);
    expect(g.travelReimbursement).toBe(22.6);
  });

  it('subtracts meal and other deductions from gross', () => {
    const g = computeShiftGross(shift({ mealDeduction: 10, otherDeduction: 5 }), hourlyProfile);
    const base = 8 * 40;
    expect(g.totalGross).toBeCloseTo(base - 15, 5);
  });
});

describe('computeMonthlyGross', () => {
  it('sums shift gross for hourly employees', () => {
    const shifts = [
      shift({ id: 'a', startTime: '09:00', endTime: '17:00' }),
      shift({ id: 'b', date: '2026-07-02', startTime: '09:00', endTime: '17:00' }),
    ];
    const result = computeMonthlyGross(shifts, hourlyProfile, { carValueAddition: 0 });
    expect(result.totalGross).toBeCloseTo(2 * 8 * 40, 5);
  });

  it('uses fixed monthly base plus only overtime/shabbat premiums for monthly employees', () => {
    const monthlyProfile: RateProfile = {
      employmentType: 'monthly',
      monthlySalary: 10000,
      standardWeeklyHours: 42,
      workDaysPerWeek: 5,
    };
    const shifts = [shift({ id: 'a', startTime: '08:00', endTime: '19:36' })]; // 2h@125% + 1h@150%
    const result = computeMonthlyGross(shifts, monthlyProfile, { carValueAddition: 0 });
    const hourlyEquiv = 10000 / 182;
    const expectedOvertime = 2 * hourlyEquiv * 1.25 + 1 * hourlyEquiv * 1.5;
    expect(result.monthlyBase).toBe(10000);
    expect(result.regularPay).toBe(0);
    expect(result.overtimePay).toBeCloseTo(expectedOvertime, 5);
    expect(result.totalGross).toBeCloseTo(10000 + expectedOvertime, 5);
  });

  it('excludes travel reimbursement from taxable gross', () => {
    const shifts = [shift({ travelReimbursement: 22.6 })];
    const result = computeMonthlyGross(shifts, hourlyProfile, { carValueAddition: 0 });
    expect(result.taxableGross).toBeCloseTo(result.totalGross - 22.6, 5);
  });
});
