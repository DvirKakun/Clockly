import { computeNetPay } from '@/lib/calc/netEngine';
import type { MonthlyGrossResult, TaxProfile } from '@/lib/calc/types';

/** The user-entered payslip figures (each optional — partial entry is allowed). National
 * insurance and health tax are separate, matching how an Israeli payslip breaks them out. */
export interface PayslipFigures {
  gross: number | null;
  net: number | null;
  income_tax: number | null;
  national_insurance: number | null;
  health_tax: number | null;
  pension: number | null;
  travel: number | null;
}

/** Clockly's estimate for a single workplace's payslip — every line has a value. */
export type PayslipExpected = Record<keyof PayslipFigures, number>;

export type ComparisonStatus = 'match' | 'off' | 'missing';

export interface ComparisonRow {
  key: keyof PayslipFigures;
  label: string;
  expected: number;
  actual: number | null;
  diff: number | null; // actual − expected; null when the user didn't enter this field
  status: ComparisonStatus;
}

// A payslip and an estimate rarely agree to the shekel (employer rounding, a bonus that wasn't
// logged, a tax-point nuance), so treat anything within this band as a match rather than crying
// wolf on every row. Whichever is larger of a flat floor and a small ratio of the expected value.
// The floor is deliberately small so a real gap on a low-value row (e.g. a ₪4 miss on a ₪58
// pension deduction, ~7%) still surfaces instead of hiding under the flat band.
const MATCH_FLOOR = 2; // ₪
const MATCH_RATIO = 0.015; // 1.5%

function statusFor(expected: number, actual: number | null): ComparisonStatus {
  if (actual == null) return 'missing';
  const tolerance = Math.max(MATCH_FLOOR, Math.abs(expected) * MATCH_RATIO);
  return Math.abs(actual - expected) <= tolerance ? 'match' : 'off';
}

/**
 * Clockly's expected payslip figures for one workplace, computed "as if this were the person's
 * only income": gross and travel come straight from that workplace's monthly gross, and the tax /
 * national-insurance / health / pension lines come from running the net calc on just that
 * workplace's taxable income. For someone with a single job this is exact; for multiple jobs each
 * employer's actual withholding depends on the worker's tax coordination (תיאום מס), so the tax
 * lines are an estimate — the UI says so.
 */
export function expectedForWorkplace(gross: MonthlyGrossResult, taxProfile: TaxProfile): PayslipExpected {
  const net = computeNetPay(gross.taxableGross, taxProfile);
  return {
    gross: gross.totalGross,
    income_tax: net.incomeTax,
    national_insurance: net.nationalInsurance,
    health_tax: net.healthTax,
    pension: net.pensionEmployee,
    travel: gross.travelReimbursement,
    net: net.netPay + gross.travelReimbursement,
  };
}

/** Line-by-line comparison of one entered payslip against Clockly's estimate for that workplace. */
export function buildPayslipComparison(expected: PayslipExpected, actual: PayslipFigures): ComparisonRow[] {
  const rows: { key: keyof PayslipFigures; label: string }[] = [
    { key: 'gross', label: 'ברוטו' },
    { key: 'income_tax', label: 'מס הכנסה' },
    { key: 'national_insurance', label: 'ביטוח לאומי' },
    { key: 'health_tax', label: 'דמי בריאות' },
    { key: 'pension', label: 'פנסיה' },
    { key: 'travel', label: 'נסיעות' },
    { key: 'net', label: 'נטו לתשלום' },
  ];

  return rows.map(({ key, label }) => {
    const a = actual[key];
    const exp = expected[key];
    return { key, label, expected: exp, actual: a, diff: a == null ? null : a - exp, status: statusFor(exp, a) };
  });
}
