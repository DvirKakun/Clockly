import type { MonthSummary } from '@/lib/calc/monthSummary';

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
 * Line-by-line comparison of an entered payslip against Clockly's estimate for the same period.
 * The estimate side comes straight from `computeMonthSummary`; deductions (tax, social security,
 * pension) are compared as the positive amounts a payslip shows.
 */
export function buildPayslipComparison(summary: MonthSummary, actual: PayslipFigures): ComparisonRow[] {
  const rows: { key: keyof PayslipFigures; label: string; expected: number }[] = [
    { key: 'gross', label: 'ברוטו', expected: summary.totalGross },
    { key: 'income_tax', label: 'מס הכנסה', expected: summary.net.incomeTax },
    { key: 'national_insurance', label: 'ביטוח לאומי', expected: summary.net.nationalInsurance },
    { key: 'health_tax', label: 'דמי בריאות', expected: summary.net.healthTax },
    { key: 'pension', label: 'פנסיה', expected: summary.net.pensionEmployee },
    { key: 'travel', label: 'נסיעות', expected: summary.totalTravelReimbursement },
    { key: 'net', label: 'נטו לתשלום', expected: summary.takeHomePay },
  ];

  return rows.map(({ key, label, expected }) => {
    const a = actual[key];
    return { key, label, expected, actual: a, diff: a == null ? null : a - expected, status: statusFor(expected, a) };
  });
}
