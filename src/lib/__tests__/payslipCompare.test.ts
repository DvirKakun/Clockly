import { describe, expect, it } from 'vitest';
import { buildPayslipComparison, type PayslipFigures } from '../payslipCompare';
import type { MonthSummary } from '@/lib/calc/monthSummary';

// Minimal summary shaped just enough for the comparison (only the fields it reads).
function fakeSummary(): MonthSummary {
  return {
    byWorkplace: [],
    totalTaxableGross: 10000,
    totalGross: 10000,
    totalTravelReimbursement: 200,
    takeHomePay: 8200,
    net: {
      taxableGross: 10000,
      creditPoints: 2.25,
      creditPointsValue: 545,
      incomeTaxBeforeCredits: 1000,
      incomeTax: 500,
      nationalInsurance: 300,
      healthTax: 400,
      pensionEmployee: 600,
      kerenHishtalmutEmployee: 0,
      totalDeductions: 1800,
      netPay: 8000,
    },
  } as MonthSummary;
}

const emptyActual: PayslipFigures = {
  gross: null,
  net: null,
  income_tax: null,
  national_insurance: null,
  health_tax: null,
  pension: null,
  travel: null,
};

describe('buildPayslipComparison', () => {
  it('maps each estimate field to the right expected value', () => {
    const rows = buildPayslipComparison(fakeSummary(), emptyActual);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.expected]));
    expect(byKey.gross).toBe(10000);
    expect(byKey.income_tax).toBe(500);
    expect(byKey.national_insurance).toBe(300);
    expect(byKey.health_tax).toBe(400);
    expect(byKey.pension).toBe(600);
    expect(byKey.travel).toBe(200);
    expect(byKey.net).toBe(8200);
  });

  it('marks unentered fields as missing with a null diff', () => {
    const rows = buildPayslipComparison(fakeSummary(), emptyActual);
    expect(rows.every((r) => r.status === 'missing' && r.diff === null)).toBe(true);
  });

  it('treats a value within tolerance (max of ₪2 or 1.5%) as a match', () => {
    // gross expected 10000 → 1.5% tolerance = ₪150; 10120 is within it.
    const rows = buildPayslipComparison(fakeSummary(), { ...emptyActual, gross: 10120 });
    const gross = rows.find((r) => r.key === 'gross')!;
    expect(gross.status).toBe('match');
    expect(gross.diff).toBe(120);
  });

  it('flags a value outside tolerance as off, with a signed diff', () => {
    // gross 9700 is ₪300 under, beyond the ₪150 tolerance.
    const rows = buildPayslipComparison(fakeSummary(), { ...emptyActual, gross: 9700 });
    const gross = rows.find((r) => r.key === 'gross')!;
    expect(gross.status).toBe('off');
    expect(gross.diff).toBe(-300);
  });

  it('applies the ₪2 floor when 1.5% would be smaller', () => {
    // travel expected 100 → 1.5% = ₪1.5, below the ₪2 floor, so tolerance is ₪2.
    const summary = { ...fakeSummary(), totalTravelReimbursement: 100 } as MonthSummary;
    const within = buildPayslipComparison(summary, { ...emptyActual, travel: 102 });
    expect(within.find((r) => r.key === 'travel')!.status).toBe('match');
    const beyond = buildPayslipComparison(summary, { ...emptyActual, travel: 103 });
    expect(beyond.find((r) => r.key === 'travel')!.status).toBe('off');
  });

  it('surfaces a small real gap that the old ₪5 floor would have hidden', () => {
    // Regression: pension expected ₪58, entered ₪62 (₪4 / ~7% off). Under the previous
    // flat ₪5 floor this read as a match; with max(₪2, 1.5%) → ₪2 band it flags off.
    const summary = { ...fakeSummary(), net: { ...fakeSummary().net, pensionEmployee: 58 } } as MonthSummary;
    const rows = buildPayslipComparison(summary, { ...emptyActual, pension: 62 });
    expect(rows.find((r) => r.key === 'pension')!.status).toBe('off');
  });
});
