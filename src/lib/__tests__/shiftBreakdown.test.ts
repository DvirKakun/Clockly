import { describe, expect, it } from 'vitest';
import { buildShiftBreakdown } from '../shiftBreakdown';
import type { ShiftGrossResult } from '../calc/types';

function result(over: Partial<ShiftGrossResult> = {}): ShiftGrossResult {
  return {
    shiftId: 's1',
    hours: {
      totalHours: 8,
      paidBreakHours: 0,
      unpaidBreakHours: 0,
      payableHours: 8,
      isNightShift: false,
      standardDailyHours: 8.6,
      regularHours: 8,
      overtime125Hours: 0,
      overtime150Hours: 0,
      shabbatBaseHours: 0,
      shabbatOvertime175Hours: 0,
      shabbatOvertime200Hours: 0,
      ...(over.hours ?? {}),
    },
    hourlyRateUsed: 50,
    regularPay: 400,
    overtime125Pay: 0,
    overtime150Pay: 0,
    shabbatBasePay: 0,
    shabbatOvertime175Pay: 0,
    shabbatOvertime200Pay: 0,
    bonuses: 0,
    tips: 0,
    travelReimbursement: 0,
    mealDeduction: 0,
    otherDeduction: 0,
    totalGross: 400,
    ...over,
  } as ShiftGrossResult;
}

const keys = (rows: { key: string }[]) => rows.map((r) => r.key);

describe('buildShiftBreakdown tiers', () => {
  it('lists only the regular tier for a plain weekday shift', () => {
    const { tiers } = buildShiftBreakdown(result());
    expect(keys(tiers)).toEqual(['regular']);
  });

  it('does not list five empty Shabbat rows for a shift that never touched Shabbat', () => {
    const { tiers } = buildShiftBreakdown(result());
    expect(keys(tiers)).not.toContain('shabbat150');
    expect(keys(tiers)).not.toContain('shabbat175');
    expect(keys(tiers)).not.toContain('shabbat200');
  });

  it('breaks out overtime tiers with their hours and money', () => {
    const { tiers } = buildShiftBreakdown(
      result({
        hours: { regularHours: 8.6, overtime125Hours: 2, overtime150Hours: 1.4 } as never,
        regularPay: 430,
        overtime125Pay: 125,
        overtime150Pay: 105,
        totalGross: 660,
      })
    );

    expect(keys(tiers)).toEqual(['regular', 'ot125', 'ot150']);
    const ot125 = tiers.find((t) => t.key === 'ot125')!;
    expect(ot125.hours).toBe(2);
    expect(ot125.amount).toBe(125);
    expect(ot125.label).toContain('125%');
  });

  it('breaks out the Shabbat tiers', () => {
    const { tiers } = buildShiftBreakdown(
      result({
        hours: { regularHours: 0, shabbatBaseHours: 8, shabbatOvertime175Hours: 2 } as never,
        regularPay: 0,
        shabbatBasePay: 600,
        shabbatOvertime175Pay: 175,
        totalGross: 775,
      })
    );
    expect(keys(tiers)).toEqual(['shabbat150', 'shabbat175']);
  });

  it('keeps tiers in rate order', () => {
    const { tiers } = buildShiftBreakdown(
      result({
        hours: {
          regularHours: 8, overtime125Hours: 2, overtime150Hours: 1,
          shabbatBaseHours: 3, shabbatOvertime175Hours: 1, shabbatOvertime200Hours: 1,
        } as never,
        regularPay: 400, overtime125Pay: 125, overtime150Pay: 75,
        shabbatBasePay: 225, shabbatOvertime175Pay: 87.5, shabbatOvertime200Pay: 100,
        totalGross: 1012.5,
      })
    );
    expect(keys(tiers)).toEqual(['regular', 'ot125', 'ot150', 'shabbat150', 'shabbat175', 'shabbat200']);
  });
});

describe('buildShiftBreakdown adjustments', () => {
  it('omits adjustments that are zero', () => {
    const { adjustments } = buildShiftBreakdown(result());
    expect(adjustments).toHaveLength(0);
  });

  it('lists bonuses and tips when present', () => {
    const { adjustments } = buildShiftBreakdown(result({ bonuses: 100, tips: 40, totalGross: 540 }));
    expect(keys(adjustments)).toEqual(['bonuses', 'tips']);
    expect(adjustments.find((a) => a.key === 'bonuses')!.amount).toBe(100);
  });

  it('lists deductions as negative amounts', () => {
    const { adjustments } = buildShiftBreakdown(
      result({ mealDeduction: 15, otherDeduction: 5, totalGross: 380 })
    );
    expect(adjustments.find((a) => a.key === 'meal')!.amount).toBe(-15);
    expect(adjustments.find((a) => a.key === 'other')!.amount).toBe(-5);
  });

  it('keeps travel as a positive adjustment', () => {
    const { adjustments } = buildShiftBreakdown(result({ travelReimbursement: 22.6, totalGross: 422.6 }));
    expect(adjustments.find((a) => a.key === 'travel')!.amount).toBeCloseTo(22.6, 5);
  });

  it('gives adjustments no hours — they are not time-based', () => {
    const { adjustments } = buildShiftBreakdown(result({ bonuses: 100, totalGross: 500 }));
    expect(adjustments[0].hours).toBeUndefined();
  });
});

describe('buildShiftBreakdown totals', () => {
  it('the rows add up to the shift total', () => {
    const gross = result({
      hours: { regularHours: 8.6, overtime125Hours: 2 } as never,
      regularPay: 430,
      overtime125Pay: 125,
      bonuses: 100,
      tips: 40,
      travelReimbursement: 22.6,
      mealDeduction: 15,
      otherDeduction: 5,
      totalGross: 697.6,
    });
    const { tiers, adjustments, totalGross } = buildShiftBreakdown(gross);
    const summed = [...tiers, ...adjustments].reduce((s, r) => s + r.amount, 0);
    expect(summed).toBeCloseTo(totalGross, 6);
  });

  it('carries the hours figures through, including break split', () => {
    const b = buildShiftBreakdown(
      result({ hours: { totalHours: 9, paidBreakHours: 0.5, unpaidBreakHours: 1, payableHours: 8 } as never })
    );
    expect(b.totalHours).toBe(9);
    expect(b.paidBreakHours).toBe(0.5);
    expect(b.unpaidBreakHours).toBe(1);
    expect(b.payableHours).toBe(8);
  });

  it('carries the hourly rate used', () => {
    expect(buildShiftBreakdown(result({ hourlyRateUsed: 64 })).hourlyRateUsed).toBe(64);
  });

  it('handles an all-zero shift without inventing rows', () => {
    const b = buildShiftBreakdown(
      result({
        hours: { totalHours: 0, payableHours: 0, regularHours: 0 } as never,
        regularPay: 0,
        totalGross: 0,
      })
    );
    expect(b.tiers).toHaveLength(0);
    expect(b.adjustments).toHaveLength(0);
    expect(b.totalGross).toBe(0);
  });

  it('handles deductions exceeding pay', () => {
    const b = buildShiftBreakdown(result({ mealDeduction: 1000, totalGross: -600 }));
    const summed = [...b.tiers, ...b.adjustments].reduce((s, r) => s + r.amount, 0);
    expect(summed).toBeCloseTo(-600, 6);
    expect(b.totalGross).toBeLessThan(0);
  });
});
