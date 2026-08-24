import type { MonthSummary } from './calc/monthSummary';

/**
 * Narrows a month summary to a single workplace, for the per-employer report.
 *
 * The subtle part is what is *not* recomputed. Statutory deductions are calculated on aggregate
 * taxable gross across every employer, because tax brackets and the Bituach Leumi ceiling are
 * shared — so re-running the net engine on one workplace's gross and presenting the result as
 * "that job's net" would produce a figure no payslip could match. The aggregate `net` and
 * `takeHomePay` are therefore carried through untouched; a genuine per-employer estimate comes
 * from `expectedForWorkplace` (see payslipCompare), which states its "as if this were the only
 * income" contract explicitly.
 *
 * An unknown or archived id falls back to the unfiltered summary rather than rendering an empty
 * report.
 */
export function filterSummaryToWorkplace(summary: MonthSummary, workplaceId: string | null): MonthSummary {
  if (!workplaceId) return summary;

  const entry = summary.byWorkplace.find((w) => w.workplace.id === workplaceId);
  if (!entry) return summary;

  const { gross } = entry;

  return {
    ...summary,
    byWorkplace: [entry],
    totals: {
      totalHours: gross.totalHours,
      monthlyBase: gross.monthlyBase,
      regularPay: gross.regularPay,
      overtimePay: gross.overtimePay,
      shabbatPay: gross.shabbatPay,
      bonuses: gross.bonuses,
      tips: gross.tips,
      travelReimbursement: gross.travelReimbursement,
      mealDeductions: gross.mealDeductions,
      otherDeductions: gross.otherDeductions,
      // Car value belongs to the person, not to any one employer, so it is not attributed here.
      carValueAddition: 0,
    },
    totalGross: gross.totalGross,
    totalTaxableGross: gross.taxableGross,
    totalTravelReimbursement: gross.travelReimbursement,
    // Deliberately unchanged — see the note above.
    net: summary.net,
    takeHomePay: summary.takeHomePay,
  };
}
