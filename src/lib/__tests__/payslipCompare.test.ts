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
      socialSecurity: 700,
      socialSecurityBreakdown: { belowThreshold: 700, aboveThreshold: 0 },
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
  social_security: null,
  pension: null,
  travel: null,
};

describe('buildPayslipComparison', () => {
  it('maps each estimate field to the right expected value', () => {
    const rows = buildPayslipComparison(fakeSummary(), emptyActual);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.expected]));
    expect(byKey.gross).toBe(10000);
    expect(byKey.income_tax).toBe(500);
    expect(byKey.social_security).toBe(700);
    expect(byKey.pension).toBe(600);
    expect(byKey.travel).toBe(200);
    expect(byKey.net).toBe(8200);
  });

  it('marks unentered fields as missing with a null diff', () => {
    const rows = buildPayslipComparison(fakeSummary(), emptyActual);
    expect(rows.every((r) => r.status === 'missing' && r.diff === null)).toBe(true);
  });

  it('treats a value within tolerance (max of ₪5 or 1%) as a match', () => {
    // gross expected 10000 → 1% tolerance = ₪100; 10080 is within it.
    const rows = buildPayslipComparison(fakeSummary(), { ...emptyActual, gross: 10080 });
    const gross = rows.find((r) => r.key === 'gross')!;
    expect(gross.status).toBe('match');
    expect(gross.diff).toBe(80);
  });

  it('flags a value outside tolerance as off, with a signed diff', () => {
    // gross 9700 is ₪300 under, beyond the ₪100 tolerance.
    const rows = buildPayslipComparison(fakeSummary(), { ...emptyActual, gross: 9700 });
    const gross = rows.find((r) => r.key === 'gross')!;
    expect(gross.status).toBe('off');
    expect(gross.diff).toBe(-300);
  });

  it('uses the ₪5 floor for small expected values like travel', () => {
    // travel expected 200 → 1% = ₪2, but the ₪5 floor applies; 204 is within ₪5.
    const within = buildPayslipComparison(fakeSummary(), { ...emptyActual, travel: 204 });
    expect(within.find((r) => r.key === 'travel')!.status).toBe('match');
    const beyond = buildPayslipComparison(fakeSummary(), { ...emptyActual, travel: 190 });
    expect(beyond.find((r) => r.key === 'travel')!.status).toBe('off');
  });
});
