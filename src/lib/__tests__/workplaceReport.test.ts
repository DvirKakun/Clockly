import { describe, expect, it } from 'vitest';
import { filterSummaryToWorkplace } from '../workplaceReport';
import type { MonthSummary, WorkplaceMonthSummary } from '../calc/monthSummary';
import type { MonthlyGrossResult, NetResult } from '../calc/types';

function gross(over: Partial<MonthlyGrossResult> = {}): MonthlyGrossResult {
  return {
    shiftResults: [],
    totalHours: 100,
    monthlyBase: 0,
    regularPay: 5000,
    overtimePay: 500,
    shabbatPay: 300,
    bonuses: 200,
    tips: 100,
    travelReimbursement: 400,
    mealDeductions: 50,
    otherDeductions: 0,
    carValueAddition: 0,
    totalGross: 6450,
    taxableGross: 6050,
    ...over,
  } as MonthlyGrossResult;
}

function entry(id: string, name: string, g: MonthlyGrossResult): WorkplaceMonthSummary {
  return { workplace: { id, name, color: '#000' }, gross: g } as WorkplaceMonthSummary;
}

const net: NetResult = {
  taxableGross: 12100,
  creditPoints: 2.25,
  creditPointsValue: 544.5,
  incomeTaxBeforeCredits: 1400,
  incomeTax: 855.5,
  nationalInsurance: 500,
  healthTax: 400,
  pensionEmployee: 726,
  kerenHishtalmutEmployee: 0,
  totalDeductions: 2481.5,
  netPay: 9618.5,
} as NetResult;

const a = gross();
const b = gross({ totalHours: 60, regularPay: 3000, bonuses: 0, tips: 500, totalGross: 3500, taxableGross: 3500, travelReimbursement: 0 });

const summary: MonthSummary = {
  byWorkplace: [entry('a', 'Cafe', a), entry('b', 'Bar', b)],
  totals: {
    totalHours: 160,
    monthlyBase: 0,
    regularPay: 8000,
    overtimePay: 500,
    shabbatPay: 300,
    bonuses: 200,
    tips: 600,
    travelReimbursement: 400,
    mealDeductions: 50,
    otherDeductions: 0,
    carValueAddition: 1000,
  },
  totalTaxableGross: 12100,
  totalGross: 12500,
  totalTravelReimbursement: 400,
  net,
  takeHomePay: 10018.5,
};

describe('filterSummaryToWorkplace', () => {
  it('narrows to the requested workplace', () => {
    const filtered = filterSummaryToWorkplace(summary, 'a');
    expect(filtered.byWorkplace).toHaveLength(1);
    expect(filtered.byWorkplace[0].workplace.id).toBe('a');
  });

  it("reports that workplace's own gross figures", () => {
    const filtered = filterSummaryToWorkplace(summary, 'b');
    expect(filtered.totalGross).toBe(3500);
    expect(filtered.totals.totalHours).toBe(60);
    expect(filtered.totals.tips).toBe(500);
    expect(filtered.totals.bonuses).toBe(0);
  });

  it('carries the aggregate net through UNCHANGED rather than recomputing it per workplace', () => {
    // The constraint this whole module exists for: tax brackets and the Bituach Leumi ceiling are
    // shared across employers, so a net recomputed from one workplace's gross would be a figure no
    // payslip could match. A genuine per-employer estimate comes from expectedForWorkplace.
    const filtered = filterSummaryToWorkplace(summary, 'a');
    expect(filtered.net).toBe(summary.net);
    expect(filtered.takeHomePay).toBe(summary.takeHomePay);
  });

  it('does not attribute car value to any single employer', () => {
    const filtered = filterSummaryToWorkplace(summary, 'a');
    expect(filtered.totals.carValueAddition).toBe(0);
  });

  it('falls back to the unfiltered summary for an unknown or archived id', () => {
    expect(filterSummaryToWorkplace(summary, 'does-not-exist')).toBe(summary);
  });

  it('returns the unfiltered summary when no filter is set', () => {
    expect(filterSummaryToWorkplace(summary, null)).toBe(summary);
    expect(filterSummaryToWorkplace(summary, '')).toBe(summary);
  });

  it('is effectively a no-op for a single-workplace summary', () => {
    const single: MonthSummary = { ...summary, byWorkplace: [entry('a', 'Cafe', a)] };
    const filtered = filterSummaryToWorkplace(single, 'a');
    expect(filtered.byWorkplace).toHaveLength(1);
    expect(filtered.totalGross).toBe(a.totalGross);
  });

  it('keeps travel consistent between the totals and the top-level field', () => {
    const filtered = filterSummaryToWorkplace(summary, 'a');
    expect(filtered.totalTravelReimbursement).toBe(filtered.totals.travelReimbursement);
    expect(filtered.totalTravelReimbursement).toBe(a.travelReimbursement);
  });

  it('leaves the original summary untouched', () => {
    const before = JSON.stringify(summary);
    filterSummaryToWorkplace(summary, 'a');
    expect(JSON.stringify(summary)).toBe(before);
  });

  it('keeps the filtered lines adding up to the filtered gross', () => {
    const filtered = filterSummaryToWorkplace(summary, 'a');
    const t = filtered.totals;
    const itemized =
      t.monthlyBase + t.regularPay + t.overtimePay + t.shabbatPay + t.bonuses + t.tips +
      t.travelReimbursement + t.carValueAddition - t.mealDeductions - t.otherDeductions;
    expect(itemized).toBeCloseTo(filtered.totalGross, 6);
  });
});
