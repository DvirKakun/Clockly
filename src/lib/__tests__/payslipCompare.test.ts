import { describe, expect, it } from 'vitest';
import { buildPayslipComparison, expectedForWorkplace, type PayslipExpected, type PayslipFigures } from '../payslipCompare';
import type { MonthlyGrossResult, TaxProfile } from '@/lib/calc/types';

// Clockly's estimate for one workplace (all lines present).
function fakeExpected(overrides: Partial<PayslipExpected> = {}): PayslipExpected {
  return {
    gross: 10000,
    income_tax: 500,
    national_insurance: 300,
    health_tax: 400,
    pension: 600,
    travel: 200,
    net: 8200,
    ...overrides,
  };
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
    const rows = buildPayslipComparison(fakeExpected(), emptyActual);
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
    const rows = buildPayslipComparison(fakeExpected(), emptyActual);
    expect(rows.every((r) => r.status === 'missing' && r.diff === null)).toBe(true);
  });

  it('treats a value within tolerance (max of ₪2 or 1.5%) as a match', () => {
    // gross expected 10000 → 1.5% tolerance = ₪150; 10120 is within it.
    const rows = buildPayslipComparison(fakeExpected(), { ...emptyActual, gross: 10120 });
    const gross = rows.find((r) => r.key === 'gross')!;
    expect(gross.status).toBe('match');
    expect(gross.diff).toBe(120);
  });

  it('flags a value outside tolerance as off, with a signed diff', () => {
    // gross 9700 is ₪300 under, beyond the ₪150 tolerance.
    const rows = buildPayslipComparison(fakeExpected(), { ...emptyActual, gross: 9700 });
    const gross = rows.find((r) => r.key === 'gross')!;
    expect(gross.status).toBe('off');
    expect(gross.diff).toBe(-300);
  });

  it('applies the ₪2 floor when 1.5% would be smaller', () => {
    // travel expected 100 → 1.5% = ₪1.5, below the ₪2 floor, so tolerance is ₪2.
    const expected = fakeExpected({ travel: 100 });
    expect(buildPayslipComparison(expected, { ...emptyActual, travel: 102 }).find((r) => r.key === 'travel')!.status).toBe('match');
    expect(buildPayslipComparison(expected, { ...emptyActual, travel: 103 }).find((r) => r.key === 'travel')!.status).toBe('off');
  });

  it('surfaces a small real gap that the old ₪5 floor would have hidden', () => {
    // Regression: pension expected ₪58, entered ₪62 (₪4 / ~7% off). Under the previous
    // flat ₪5 floor this read as a match; with max(₪2, 1.5%) → ₪2 band it flags off.
    const rows = buildPayslipComparison(fakeExpected({ pension: 58 }), { ...emptyActual, pension: 62 });
    expect(rows.find((r) => r.key === 'pension')!.status).toBe('off');
  });
});

describe('expectedForWorkplace', () => {
  const taxProfile: TaxProfile = {
    isResident: true,
    isFemale: false,
    additionalCreditPoints: 0,
    pensionOptIn: true,
    kerenHishtalmutOptIn: false,
    carValueAddition: 0,
  };

  // Only the two fields the helper reads off the gross result matter here.
  function grossOf(totalGross: number, travel: number): MonthlyGrossResult {
    return { totalGross, travelReimbursement: travel, taxableGross: totalGross - travel } as MonthlyGrossResult;
  }

  it('takes gross and travel straight from the workplace gross', () => {
    const e = expectedForWorkplace(grossOf(9000, 200), taxProfile);
    expect(e.gross).toBe(9000);
    expect(e.travel).toBe(200);
  });

  it('derives the deductions from the net calc on that workplace’s taxable income', () => {
    const e = expectedForWorkplace(grossOf(9000, 200), taxProfile);
    // Deductions are positive amounts and net is take-home (incl. the non-taxable travel).
    expect(e.income_tax).toBeGreaterThanOrEqual(0);
    expect(e.national_insurance).toBeGreaterThan(0);
    expect(e.health_tax).toBeGreaterThan(0);
    expect(e.pension).toBeGreaterThan(0);
    expect(e.net).toBeCloseTo(
      e.gross - e.travel - e.income_tax - e.national_insurance - e.health_tax - e.pension + e.travel,
      5
    );
  });

  it('adds no pension when the worker opted out', () => {
    const e = expectedForWorkplace(grossOf(9000, 200), { ...taxProfile, pensionOptIn: false });
    expect(e.pension).toBe(0);
  });
});
