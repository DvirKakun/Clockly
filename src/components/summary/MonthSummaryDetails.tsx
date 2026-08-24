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
}: {
  summary: MonthSummary;
  /** Hidden when there's only one workplace — it would just repeat the totals above. */
  showByWorkplace?: boolean;
}) {
  const { totals, net } = summary;
  const hasMultipleWorkplaces = summary.byWorkplace.length > 1;

  return (
    <>
      <Card>
        <SectionHeading>הכנסות</SectionHeading>
        {/* Base pay is always shown, even at zero: hiding a component of an itemized total would
            make the lines fail to add up to the gross stated at the bottom. */}
        {totals.monthlyBase > 0 && <Row label="שכר בסיס (חודשי)" value={totals.monthlyBase} alwaysShow />}
        {totals.monthlyBase === 0 && <Row label="שכר בסיס" value={totals.regularPay} alwaysShow />}
        {totals.monthlyBase > 0 && totals.regularPay > 0 && <Row label="שכר שעתי" value={totals.regularPay} />}
        <Row label="שעות נוספות" value={totals.overtimePay} />
        <Row label="שבת וחג" value={totals.shabbatPay} />
        <Row label="בונוסים" value={totals.bonuses} />
        <Row label="טיפים" value={totals.tips} />
        <Row label="שווי רכב" value={totals.carValueAddition} />
        <Row label="ניכוי ארוחות" value={-totals.mealDeductions} />
        <Row label="ניכויים אחרים" value={-totals.otherDeductions} />
        {/* Travel is a reimbursement, not income — it's excluded from taxable gross by the engine,
            so it's shown here as its own line rather than folded into the pay above. */}
        <Row label="החזר נסיעות" value={totals.travelReimbursement} />
        <TotalRow label="סה&quot;כ ברוטו" value={summary.totalGross} />
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          {totals.totalHours.toFixed(1)} שעות בתשלום החודש
        </p>
      </Card>

      <Card>
        <SectionHeading>ניכויי חובה</SectionHeading>
        <Row label="מס הכנסה" value={-net.incomeTax} />
        <Row label="ביטוח לאומי" value={-net.nationalInsurance} />
        <Row label="דמי בריאות" value={-net.healthTax} />
        <Row label="פנסיה" value={-net.pensionEmployee} />
        <Row label="קרן השתלמות" value={-net.kerenHishtalmutEmployee} />
        <TotalRow label="סה&quot;כ ניכויים" value={-net.totalDeductions} />
        <p className="mt-2 text-xs text-black/40 dark:text-white/40">
          {net.creditPoints.toFixed(2)} נקודות זיכוי ({formatCurrency(net.creditPointsValue)})
        </p>
      </Card>

      <Card className="bg-gradient-to-br from-brand-500 to-accent-cyan text-white">
        <p className="text-sm opacity-80">נטו לתשלום</p>
        <p className="mt-1 text-3xl font-bold">{formatCurrency(summary.takeHomePay)}</p>
        <p className="mt-2 text-xs opacity-80">
          כולל החזר נסיעות של {formatCurrency(totals.travelReimbursement)}, שאינו חייב במס
        </p>
      </Card>

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-black/60 dark:text-white/60">{children}</h3>;
}

/** A single itemized line. Zero-valued lines are hidden unless the total depends on them. */
function Row({ label, value, alwaysShow = false }: { label: string; value: number; alwaysShow?: boolean }) {
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
