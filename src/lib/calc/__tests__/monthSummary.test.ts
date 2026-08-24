import { describe, expect, it } from 'vitest';
import { computeMonthSummary } from '../monthSummary';
import type { ShiftWithBreaks } from '@/hooks/useShifts';
import type { Workplace } from '@/hooks/useWorkplaces';
import type { TaxProfileRow } from '@/hooks/useTaxProfile';

/**
 * These assert the roll-up totals the summary breakdown renders. The claim that actually matters
 * is the identity: the itemized lines a user reads must add up to the gross stated beneath them.
 * A breakdown whose parts don't sum to its whole is worse than no breakdown at all.
 */

function workplace(over: Partial<Workplace> & { id: string; name: string }): Workplace {
  return {
    color: '#3b82f6',
    created_at: '2026-01-01T00:00:00Z',
    daily_rate: null,
    employment_type: 'hourly',
    hourly_rate: 50,
    is_archived: false,
    meal_deduction_default: null,
    monthly_salary: null,
    standard_weekly_hours: 42,
    start_date: null,
    travel_daily_cost: null,
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
    work_days_per_week: 5,
    ...over,
  } as Workplace;
}

function shift(over: Partial<ShiftWithBreaks> & { id: string; workplace_id: string; date: string }): ShiftWithBreaks {
  return {
    bonuses: 0,
    clock_in_at: null,
    clock_out_at: null,
    created_at: '2026-01-01T00:00:00Z',
    crosses_midnight: false,
    day_type: 'regular',
    end_time: '17:00',
    meal_deduction: 0,
    notes: null,
    other_deduction: 0,
    source: 'manual',
    start_time: '09:00',
    tips: 0,
    travel_reimbursement: 0,
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'u1',
    breaks: [],
    ...over,
  } as ShiftWithBreaks;
}

const taxProfile: TaxProfileRow = {
  additional_credit_points: 0,
  car_value_addition: 0,
  created_at: '2026-01-01T00:00:00Z',
  id: 'tp1',
  is_female: false,
  is_resident: true,
  keren_hishtalmut_opt_in: false,
  pay_period_start_day: 1,
  pension_opt_in: false,
  updated_at: '2026-01-01T00:00:00Z',
} as TaxProfileRow;

const wpA = workplace({ id: 'a', name: 'Cafe' });
const wpB = workplace({ id: 'b', name: 'Bar', hourly_rate: 60 });

describe('computeMonthSummary totals', () => {
  it('rolls bonuses and tips up across workplaces', () => {
    const summary = computeMonthSummary(
      [wpA, wpB],
      [
        shift({ id: 's1', workplace_id: 'a', date: '2026-03-02', bonuses: 100, tips: 50 }),
        shift({ id: 's2', workplace_id: 'a', date: '2026-03-03', bonuses: 25 }),
        shift({ id: 's3', workplace_id: 'b', date: '2026-03-04', tips: 200 }),
      ],
      taxProfile
    );

    expect(summary.totals.bonuses).toBe(125);
    expect(summary.totals.tips).toBe(250);
  });

  it('rolls travel, meal and other deductions up across workplaces', () => {
    const summary = computeMonthSummary(
      [wpA, wpB],
      [
        shift({ id: 's1', workplace_id: 'a', date: '2026-03-02', travel_reimbursement: 22.6, meal_deduction: 15 }),
        shift({ id: 's2', workplace_id: 'b', date: '2026-03-03', travel_reimbursement: 22.6, other_deduction: 10 }),
      ],
      taxProfile
    );

    expect(summary.totals.travelReimbursement).toBeCloseTo(45.2, 5);
    expect(summary.totals.mealDeductions).toBe(15);
    expect(summary.totals.otherDeductions).toBe(10);
  });

  it('each roll-up equals the sum of the per-workplace figures it aggregates', () => {
    const summary = computeMonthSummary(
      [wpA, wpB],
      [
        shift({ id: 's1', workplace_id: 'a', date: '2026-03-02', bonuses: 100 }),
        shift({ id: 's2', workplace_id: 'b', date: '2026-03-07', day_type: 'shabbat', tips: 40 }),
        shift({ id: 's3', workplace_id: 'b', date: '2026-03-09', start_time: '09:00', end_time: '21:00' }),
      ],
      taxProfile
    );

    const sum = (pick: (g: (typeof summary.byWorkplace)[number]['gross']) => number) =>
      summary.byWorkplace.reduce((acc, w) => acc + pick(w.gross), 0);

    expect(summary.totals.totalHours).toBeCloseTo(sum((g) => g.totalHours), 6);
    expect(summary.totals.overtimePay).toBeCloseTo(sum((g) => g.overtimePay), 6);
    expect(summary.totals.shabbatPay).toBeCloseTo(sum((g) => g.shabbatPay), 6);
    expect(summary.totals.bonuses).toBeCloseTo(sum((g) => g.bonuses), 6);
    expect(summary.totals.tips).toBeCloseTo(sum((g) => g.tips), 6);
    expect(summary.totals.regularPay).toBeCloseTo(sum((g) => g.regularPay), 6);
  });

  it('the itemized lines add up to the stated gross', () => {
    const summary = computeMonthSummary(
      [wpA, wpB],
      [
        shift({
          id: 's1',
          workplace_id: 'a',
          date: '2026-03-02',
          bonuses: 100,
          tips: 50,
          travel_reimbursement: 22.6,
          meal_deduction: 15,
          other_deduction: 5,
        }),
        shift({ id: 's2', workplace_id: 'b', date: '2026-03-07', day_type: 'shabbat', tips: 40 }),
        shift({ id: 's3', workplace_id: 'b', date: '2026-03-09', start_time: '09:00', end_time: '21:00' }),
      ],
      taxProfile
    );

    const t = summary.totals;
    const itemized =
      t.monthlyBase +
      t.regularPay +
      t.overtimePay +
      t.shabbatPay +
      t.bonuses +
      t.tips +
      t.travelReimbursement +
      t.carValueAddition -
      t.mealDeductions -
      t.otherDeductions;

    expect(itemized).toBeCloseTo(summary.totalGross, 6);
  });

  it('excludes travel from taxable gross — it is a reimbursement, not income', () => {
    const summary = computeMonthSummary(
      [wpA],
      [shift({ id: 's1', workplace_id: 'a', date: '2026-03-02', travel_reimbursement: 22.6 })],
      taxProfile
    );

    expect(summary.totalTaxableGross).toBeCloseTo(summary.totalGross - summary.totals.travelReimbursement, 6);
  });

  it('counts car value once for the person, not once per workplace', () => {
    const summary = computeMonthSummary(
      [wpA, wpB],
      [
        shift({ id: 's1', workplace_id: 'a', date: '2026-03-02' }),
        shift({ id: 's2', workplace_id: 'b', date: '2026-03-03' }),
      ],
      { ...taxProfile, car_value_addition: 1200 }
    );

    expect(summary.totals.carValueAddition).toBe(1200);
    const grossWithoutCar = summary.byWorkplace.reduce((acc, w) => acc + w.gross.totalGross, 0);
    expect(summary.totalGross).toBeCloseTo(grossWithoutCar + 1200, 6);
  });

  it('reports zeroes for a month with no shifts rather than NaN', () => {
    const summary = computeMonthSummary([wpA, wpB], [], taxProfile);

    for (const value of Object.values(summary.totals)) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(summary.totals.bonuses).toBe(0);
    expect(summary.totals.tips).toBe(0);
    expect(summary.totals.totalHours).toBe(0);
    expect(summary.totalGross).toBe(0);
  });

  it('handles a single workplace with no bonuses or tips', () => {
    const summary = computeMonthSummary(
      [wpA],
      [shift({ id: 's1', workplace_id: 'a', date: '2026-03-02' })],
      taxProfile
    );

    expect(summary.totals.bonuses).toBe(0);
    expect(summary.totals.tips).toBe(0);
    expect(summary.totals.regularPay).toBeGreaterThan(0);
  });

  it('handles deductions exceeding additions without breaking the identity', () => {
    const summary = computeMonthSummary(
      [wpA],
      [shift({ id: 's1', workplace_id: 'a', date: '2026-03-02', meal_deduction: 10_000 })],
      taxProfile
    );

    const t = summary.totals;
    const itemized =
      t.monthlyBase + t.regularPay + t.overtimePay + t.shabbatPay + t.bonuses + t.tips +
      t.travelReimbursement + t.carValueAddition - t.mealDeductions - t.otherDeductions;

    expect(itemized).toBeCloseTo(summary.totalGross, 6);
    expect(summary.totalGross).toBeLessThan(0);
  });

  it('keeps a monthly-salaried workplace base in monthlyBase, not regularPay', () => {
    const salaried = workplace({
      id: 'c',
      name: 'Office',
      employment_type: 'monthly',
      hourly_rate: null,
      monthly_salary: 12_000,
    });
    const summary = computeMonthSummary(
      [salaried],
      [shift({ id: 's1', workplace_id: 'c', date: '2026-03-02' })],
      taxProfile
    );

    expect(summary.totals.monthlyBase).toBe(12_000);
    expect(summary.totals.regularPay).toBe(0);
  });
});
