import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/format';
import type { MonthSummary } from '@/lib/calc/monthSummary';

/**
 * One month's money, itemized — the single implementation of "what a month looks like", shared by
 * the shifts screen's summary sheet and the reports screen.
 *
 * The point of the breakdown is that gross is shown as the sum of its parts. Bonuses, tips, meal
 * deductions and Shabbat pay were computed by the engine but surfaced nowhere, so a user could see
 * a total and had no way to check how it was reached.
 */
export function MonthSummaryDetails({
  summary,
  showByWorkplace = true,
  showDeductions = true,
}: {
  summary: MonthSummary;
  /** Hidden when there's only one workplace — it would just repeat the totals above. */
  showByWorkplace?: boolean;
  /**
   * Statutory deductions and net are computed on aggregate taxable gross across every employer
   * (brackets and the Bituach Leumi ceiling are shared), so they are meaningless beside a single
   * workplace's gross. A per-workplace report turns them off and supplies its own estimate.
   */
  showDeductions?: boolean;
}) {
  const { totals, net } = summary;
  const hasMultipleWorkplaces = summary.byWorkplace.length > 1;

  return (
    <>
      <Card>
        <SectionHeading>הכנסות</SectionHeading>
        {/* Base pay is always shown, even at zero: hiding a component of an itemized total would
            make the lines fail to add up to the gross stated at the bottom. */}
        {totals.monthlyBase > 0 && <SummaryRow label="שכר בסיס (חודשי)" value={totals.monthlyBase} alwaysShow />}
        {totals.monthlyBase === 0 && <SummaryRow label="שכר בסיס" value={totals.regularPay} alwaysShow />}
        {totals.monthlyBase > 0 && totals.regularPay > 0 && <SummaryRow label="שכר שעתי" value={totals.regularPay} />}
        <SummaryRow label="שעות נוספות" value={totals.overtimePay} />
        <SummaryRow label="שבת וחג" value={totals.shabbatPay} />
        <SummaryRow label="בונוסים" value={totals.bonuses} />
        <SummaryRow label="טיפים" value={totals.tips} />
        <SummaryRow label="שווי רכב" value={totals.carValueAddition} />
        <SummaryRow label="ניכוי ארוחות" value={-totals.mealDeductions} />
        <SummaryRow label="ניכויים אחרים" value={-totals.otherDeductions} />
        {/* Travel is a reimbursement, not income — it's excluded from taxable gross by the engine,
            so it's shown here as its own line rather than folded into the pay above. */}
        <SummaryRow label="החזר נסיעות" value={totals.travelReimbursement} />
        <TotalRow label="סה&quot;כ ברוטו" value={summary.totalGross} />
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          {totals.totalHours.toFixed(1)} שעות בתשלום החודש
        </p>
      </Card>

      {showDeductions && (
      <Card>
        <SectionHeading>ניכויי חובה</SectionHeading>
        <SummaryRow label="מס הכנסה" value={-net.incomeTax} />
        <SummaryRow label="ביטוח לאומי" value={-net.nationalInsurance} />
        <SummaryRow label="דמי בריאות" value={-net.healthTax} />
        <SummaryRow label="פנסיה" value={-net.pensionEmployee} />
        <SummaryRow label="קרן השתלמות" value={-net.kerenHishtalmutEmployee} />
        <TotalRow label="סה&quot;כ ניכויים" value={-net.totalDeductions} />
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          {net.creditPoints.toFixed(2)} נקודות זיכוי ({formatCurrency(net.creditPointsValue)})
        </p>
      </Card>
      )}

      {showDeductions && (
        <NetPanel takeHomePay={summary.takeHomePay} travelReimbursement={totals.travelReimbursement} />
      )}

      {showByWorkplace && hasMultipleWorkplaces && (
        <Card>
          <SectionHeading>לפי מקום עבודה</SectionHeading>
          <div className="flex flex-col gap-3">
            {summary.byWorkplace.map(({ workplace, gross }) => (
              <div key={workplace.id} className="border-t border-black/5 pt-3 first:border-0 first:pt-0 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workplace.color }} />
                    <span className="text-sm font-medium">{workplace.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(gross.totalGross)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50 dark:text-white/50">
                  <span>{gross.totalHours.toFixed(1)} שעות</span>
                  {gross.overtimePay > 0 && <span>נוספות: {formatCurrency(gross.overtimePay)}</span>}
                  {gross.shabbatPay > 0 && <span>שבת/חג: {formatCurrency(gross.shabbatPay)}</span>}
                  {gross.bonuses > 0 && <span>בונוסים: {formatCurrency(gross.bonuses)}</span>}
                  {gross.tips > 0 && <span>טיפים: {formatCurrency(gross.tips)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

/**
 * The breakdown's conclusion. Deliberately a tinted panel rather than a saturated filled card:
 * a filled brand-gradient card reads as the screen's primary call to action, and this one does
 * nothing when tapped. In this app a gradient fill means "this navigates somewhere" (see the
 * dashboard's headline card); emphasis without a fill means "this is the important number".
 * A tinted panel with dark text also prints correctly with no print-specific overrides.
 */
function NetPanel({ takeHomePay, travelReimbursement }: { takeHomePay: number; travelReimbursement: number }) {
  return (
    <div className="rounded-3xl border border-brand-500/20 bg-brand-500/10 p-4">
      <p className="text-sm font-medium text-black/60 dark:text-white/60">נטו לתשלום</p>
      <p className="mt-1 text-3xl font-bold text-brand-600 dark:text-brand-400">{formatCurrency(takeHomePay)}</p>
      <p className="mt-2 text-xs text-black/50 dark:text-white/50">
        כולל החזר נסיעות של {formatCurrency(travelReimbursement)}, שאינו חייב במס
      </p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-black/60 dark:text-white/60">{children}</h3>;
}

/** A single itemized line. Zero-valued lines are hidden unless the total depends on them. */
export function SummaryRow({ label, value, alwaysShow = false }: { label: string; value: number; alwaysShow?: boolean }) {
  if (!alwaysShow && Math.abs(value) < 0.005) return null;
  const isDeduction = value < 0;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-black/60 dark:text-white/60">{label}</span>
      <span className={isDeduction ? 'font-medium text-red-500' : 'font-medium'}>
        {isDeduction ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </span>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm font-bold dark:border-white/10">
      <span>{label}</span>
      <span>{value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}</span>
    </div>
  );
}
