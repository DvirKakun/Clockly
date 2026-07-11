import type { NetResult, TaxProfile } from './types';
import type { LegalRatesConfig } from './rates';
import { DEFAULT_RATES } from './rates';

/** Marginal monthly income tax on the given taxable income, before credit points. */
export function computeMonthlyIncomeTax(taxableIncome: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let lowerBound = 0;
  for (const bracket of rates.incomeTaxBracketsMonthly) {
    const upTo = bracket.upTo ?? Infinity;
    if (taxableIncome <= lowerBound) break;
    const taxableInBracket = Math.min(taxableIncome, upTo) - lowerBound;
    if (taxableInBracket > 0) tax += taxableInBracket * bracket.rate;
    lowerBound = upTo;
  }
  return tax;
}

export function computeCreditPoints(taxProfile: TaxProfile, rates: LegalRatesConfig = DEFAULT_RATES): number {
  let points = 0;
  if (taxProfile.isResident) points += rates.taxCreditPoint.residentPoints;
  if (taxProfile.isFemale) points += rates.taxCreditPoint.femalePoints;
  points += taxProfile.additionalCreditPoints ?? 0;
  return points;
}

/**
 * Employee national-insurance and health-tax contributions. Israeli payslips show these as two
 * separate deductions, so they're returned split — but `total` is computed from the combined
 * per-tier rate (unchanged from before the split) and `healthTax` is derived as `total − NI`,
 * so the two always sum to exactly `total` and net-pay math is bit-identical.
 */
export function computeSocialSecurity(
  taxableIncome: number,
  rates: LegalRatesConfig = DEFAULT_RATES
): { nationalInsurance: number; healthTax: number; total: number } {
  const { lowerThreshold, upperCeiling, employeeRateBelowThreshold, employeeRateAboveThreshold, breakdown } =
    rates.socialSecurity;
  const cappedIncome = Math.min(taxableIncome, upperCeiling);
  const belowAmount = Math.min(cappedIncome, lowerThreshold);
  const aboveAmount = Math.max(0, cappedIncome - lowerThreshold);

  const total = belowAmount * employeeRateBelowThreshold + aboveAmount * employeeRateAboveThreshold;
  const nationalInsurance =
    belowAmount * breakdown.belowThreshold.nationalInsurance + aboveAmount * breakdown.aboveThreshold.nationalInsurance;
  const healthTax = total - nationalInsurance;

  return { nationalInsurance, healthTax, total };
}

export function computePensionEmployee(
  pensionableIncome: number,
  taxProfile: TaxProfile,
  rates: LegalRatesConfig = DEFAULT_RATES
): number {
  if (!taxProfile.pensionOptIn) return 0;
  const base = Math.min(pensionableIncome, rates.pension.monthlyCeiling);
  return base * rates.pension.employeeContributionRate;
}

export function computeKerenHishtalmutEmployee(
  pensionableIncome: number,
  taxProfile: TaxProfile,
  rates: LegalRatesConfig = DEFAULT_RATES
): number {
  if (!taxProfile.kerenHishtalmutOptIn) return 0;
  const base = Math.min(pensionableIncome, rates.kerenHishtalmut.monthlyCeiling);
  return base * rates.kerenHishtalmut.employeeRate;
}

/**
 * Computes take-home pay from taxable monthly gross income.
 * Uses the published monthly marginal tax brackets (standard Israeli payroll
 * withholding method), not a full annual cumulative reconciliation — see README.
 */
export function computeNetPay(
  taxableGross: number,
  taxProfile: TaxProfile,
  rates: LegalRatesConfig = DEFAULT_RATES
): NetResult {
  const creditPoints = computeCreditPoints(taxProfile, rates);
  const creditPointsValue = creditPoints * rates.taxCreditPoint.monthlyValue;

  const incomeTaxBeforeCredits = computeMonthlyIncomeTax(taxableGross, rates);
  const incomeTax = Math.max(0, incomeTaxBeforeCredits - creditPointsValue);

  const ss = computeSocialSecurity(taxableGross, rates);
  const pensionEmployee = computePensionEmployee(taxableGross, taxProfile, rates);
  const kerenHishtalmutEmployee = computeKerenHishtalmutEmployee(taxableGross, taxProfile, rates);

  const totalDeductions = incomeTax + ss.total + pensionEmployee + kerenHishtalmutEmployee;
  const netPay = taxableGross - totalDeductions;

  return {
    taxableGross,
    creditPoints,
    creditPointsValue,
    incomeTaxBeforeCredits,
    incomeTax,
    nationalInsurance: ss.nationalInsurance,
    healthTax: ss.healthTax,
    pensionEmployee,
    kerenHishtalmutEmployee,
    totalDeductions,
    netPay,
  };
}
