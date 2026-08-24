import { computeMonthlyGross } from './grossEngine';
import { computeNetPay } from './netEngine';
import { shiftRowToInput, taxProfileRowToTaxProfile, workplaceToRateProfile } from './adapters';
import type { ShiftWithBreaks } from '@/hooks/useShifts';
import type { Workplace } from '@/hooks/useWorkplaces';
import type { TaxProfileRow } from '@/hooks/useTaxProfile';
import type { MonthlyGrossResult, NetResult } from './types';

export interface WorkplaceMonthSummary {
  workplace: Workplace;
  gross: MonthlyGrossResult;
}

/**
 * The month's gross rolled up across every workplace, itemized.
 *
 * Every figure here already existed per-workplace on MonthlyGrossResult; what was missing was one
 * place that aggregates them, so views had to re-reduce ad hoc (the dashboard summed hours inline)
 * and bonuses/tips/meal deductions were simply never surfaced anywhere. Aggregating once means Home
 * and the summary sheet cannot drift apart, and the parts always add up to the whole.
 *
 * The identity that must hold:
 *   monthlyBase + regularPay + overtimePay + shabbatPay + bonuses + tips + travelReimbursement
 *     + carValueAddition − mealDeductions − otherDeductions === totalGross
 * and taxableGross === totalGross − travelReimbursement (travel is reimbursement, not income).
 */
export interface MonthTotals {
  totalHours: number;
  /** Base salary for monthly-paid workplaces; 0 for hourly/daily (their base is regularPay). */
  monthlyBase: number;
  regularPay: number;
  overtimePay: number;
  shabbatPay: number;
  bonuses: number;
  tips: number;
  travelReimbursement: number;
  mealDeductions: number;
  otherDeductions: number;
  /** שווי רכב — a per-user taxable addition, counted once rather than per workplace. */
  carValueAddition: number;
}

export interface MonthSummary {
  byWorkplace: WorkplaceMonthSummary[];
  totals: MonthTotals;
  totalTaxableGross: number;
  totalGross: number;
  totalTravelReimbursement: number;
  net: NetResult;
  takeHomePay: number;
}

function sumBy(entries: WorkplaceMonthSummary[], pick: (gross: MonthlyGrossResult) => number): number {
  return entries.reduce((sum, entry) => sum + pick(entry.gross), 0);
}

export function computeMonthSummary(
  workplaces: Workplace[],
  shifts: ShiftWithBreaks[],
  taxProfileRow: TaxProfileRow
): MonthSummary {
  const taxProfile = taxProfileRowToTaxProfile(taxProfileRow);

  const byWorkplace: WorkplaceMonthSummary[] = workplaces.map((workplace) => {
    const workplaceShifts = shifts
      .filter((s) => s.workplace_id === workplace.id)
      .map(shiftRowToInput)
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const gross = computeMonthlyGross(workplaceShifts, workplaceToRateProfile(workplace), {
      carValueAddition: 0,
    });

    return { workplace, gross };
  });

  // Car value is a property of the person, not of any one employer, so it's added once here
  // rather than inside each workplace's gross (which is why it's passed as 0 above).
  const totals: MonthTotals = {
    totalHours: sumBy(byWorkplace, (g) => g.totalHours),
    monthlyBase: sumBy(byWorkplace, (g) => g.monthlyBase),
    regularPay: sumBy(byWorkplace, (g) => g.regularPay),
    overtimePay: sumBy(byWorkplace, (g) => g.overtimePay),
    shabbatPay: sumBy(byWorkplace, (g) => g.shabbatPay),
    bonuses: sumBy(byWorkplace, (g) => g.bonuses),
    tips: sumBy(byWorkplace, (g) => g.tips),
    travelReimbursement: sumBy(byWorkplace, (g) => g.travelReimbursement),
    mealDeductions: sumBy(byWorkplace, (g) => g.mealDeductions),
    otherDeductions: sumBy(byWorkplace, (g) => g.otherDeductions),
    carValueAddition: taxProfile.carValueAddition,
  };

  const totalTaxableGross = sumBy(byWorkplace, (g) => g.taxableGross) + taxProfile.carValueAddition;
  const totalGross = sumBy(byWorkplace, (g) => g.totalGross) + taxProfile.carValueAddition;
  const totalTravelReimbursement = totals.travelReimbursement;

  const net = computeNetPay(totalTaxableGross, taxProfile);
  const takeHomePay = net.netPay + totalTravelReimbursement;

  return { byWorkplace, totals, totalTaxableGross, totalGross, totalTravelReimbursement, net, takeHomePay };
}
