import { describe, expect, it } from 'vitest';
import {
  computeCreditPoints,
  computeMonthlyIncomeTax,
  computeNetPay,
  computePensionEmployee,
  computeSocialSecurity,
} from '../netEngine';
import type { TaxProfile } from '../types';

const baseTaxProfile: TaxProfile = {
  isResident: true,
  isFemale: false,
  additionalCreditPoints: 0,
  pensionOptIn: false,
  kerenHishtalmutOptIn: false,
  carValueAddition: 0,
};

describe('computeMonthlyIncomeTax', () => {
  it('taxes income within the first bracket at 10%', () => {
    expect(computeMonthlyIncomeTax(5000)).toBeCloseTo(500, 5);
  });

  it('applies marginal rates across multiple brackets', () => {
    // 7010 * 10% + (10060-7010) * 14% = 701 + 427 = 1128
    expect(computeMonthlyIncomeTax(10060)).toBeCloseTo(1128, 5);
  });

  it('applies the top 50% bracket above 60,130', () => {
    const tax = computeMonthlyIncomeTax(61130);
    // tax up to 60130 + 1000*0.5
    const taxUpTo60130 = computeMonthlyIncomeTax(60130);
    expect(tax).toBeCloseTo(taxUpTo60130 + 500, 5);
  });

  it('returns 0 for non-positive income', () => {
    expect(computeMonthlyIncomeTax(0)).toBe(0);
    expect(computeMonthlyIncomeTax(-100)).toBe(0);
  });
});

describe('computeCreditPoints', () => {
  it('gives resident 2.25 points by default', () => {
    expect(computeCreditPoints(baseTaxProfile)).toBeCloseTo(2.25, 5);
  });

  it('adds 0.5 points for female', () => {
    expect(computeCreditPoints({ ...baseTaxProfile, isFemale: true })).toBeCloseTo(2.75, 5);
  });

  it('adds additional manual credit points', () => {
    expect(computeCreditPoints({ ...baseTaxProfile, additionalCreditPoints: 1 })).toBeCloseTo(3.25, 5);
  });
});

describe('computeSocialSecurity', () => {
  it('applies the low rate under the lower threshold', () => {
    const result = computeSocialSecurity(5000);
    expect(result.total).toBeCloseTo(5000 * 0.0427, 5);
    expect(result.aboveThreshold).toBe(0);
  });

  it('applies the split rate above the lower threshold', () => {
    const result = computeSocialSecurity(10000);
    const below = 7703 * 0.0427;
    const above = (10000 - 7703) * 0.1217;
    expect(result.belowThreshold).toBeCloseTo(below, 5);
    expect(result.aboveThreshold).toBeCloseTo(above, 5);
  });

  it('caps contributions at the ceiling', () => {
    const result = computeSocialSecurity(100000);
    const capped = computeSocialSecurity(51910);
    expect(result.total).toBeCloseTo(capped.total, 5);
  });
});

describe('computePensionEmployee', () => {
  it('returns 0 when not opted in', () => {
    expect(computePensionEmployee(10000, baseTaxProfile)).toBe(0);
  });

  it('deducts 6% of pensionable income when opted in', () => {
    const result = computePensionEmployee(10000, { ...baseTaxProfile, pensionOptIn: true });
    expect(result).toBeCloseTo(600, 5);
  });

  it('caps pensionable base at the monthly ceiling', () => {
    const result = computePensionEmployee(50000, { ...baseTaxProfile, pensionOptIn: true });
    expect(result).toBeCloseTo(13769 * 0.06, 5);
  });
});

describe('computeNetPay', () => {
  it('subtracts tax (minus credit points) and social security from gross', () => {
    const taxableGross = 8000;
    const result = computeNetPay(taxableGross, baseTaxProfile);
    expect(result.incomeTaxBeforeCredits).toBeCloseTo(computeMonthlyIncomeTax(8000), 5);
    expect(result.creditPointsValue).toBeCloseTo(2.25 * 242, 5);
    expect(result.incomeTax).toBeCloseTo(Math.max(0, result.incomeTaxBeforeCredits - result.creditPointsValue), 5);
    expect(result.netPay).toBeCloseTo(taxableGross - result.totalDeductions, 5);
  });

  it('floors income tax at 0 when credit points exceed gross tax', () => {
    const result = computeNetPay(3000, baseTaxProfile);
    expect(result.incomeTax).toBe(0);
  });

  it('never produces a net pay higher than taxable gross', () => {
    const result = computeNetPay(20000, { ...baseTaxProfile, pensionOptIn: true, kerenHishtalmutOptIn: true });
    expect(result.netPay).toBeLessThan(20000);
    expect(result.netPay).toBeGreaterThan(0);
  });
});
