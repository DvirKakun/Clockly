import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, Printer, FileText, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { useWorkplaces } from '@/hooks/useWorkplaces';
import { useShiftsForRange } from '@/hooks/useShifts';
import { useTaxProfile } from '@/hooks/useTaxProfile';
import { computeMonthSummary } from '@/lib/calc/monthSummary';
import { taxProfileRowToTaxProfile } from '@/lib/calc/adapters';
import { expectedForWorkplace } from '@/lib/payslipCompare';
import { formatCurrency } from '@/lib/format';
import { DAY_TYPE_LABELS_HE } from '@/lib/labels';
import { MONTH_NAMES_HE } from '@/lib/date';
import { payPeriodRange, payPeriodRangeLabel } from '@/lib/payPeriod';
import { MonthNavigator } from '@/components/ui/MonthNavigator';
import { PayslipCompareCard, type PayslipWorkplace } from './PayslipCompareCard';
import { usePeriodStore } from '@/store/periodStore';
import { MonthSummaryDetails } from '@/components/summary/MonthSummaryDetails';
import { filterSummaryToWorkplace } from '@/lib/workplaceReport';
import { SummaryRow } from '@/components/summary/MonthSummaryDetails';

export function ReportsPage() {
  // Shared with the dashboard and shifts screens (see periodStore).
  const year = usePeriodStore((s) => s.year);
  const month = usePeriodStore((s) => s.month);
  const setPeriod = usePeriodStore((s) => s.setPeriod);
  // A URL param, unlike the month: the filter is a real view identity worth linking to and
  // worth having in history, and it is set by a deliberate navigation rather than by repeated
  // stepping, so it doesn't pollute the back stack.
  const [searchParams, setSearchParams] = useSearchParams();
  const workplaceFilter = searchParams.get('workplace');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { data: workplaces = [], isLoading: loadingWorkplaces } = useWorkplaces();
  const { data: taxProfile } = useTaxProfile();

  // Falls back to a calendar month (start day 1) until the tax profile loads.
  const startDay = taxProfile?.pay_period_start_day ?? 1;
  const period = payPeriodRange(year, month, startDay);
  // Plain "month year" only. The LTR date range is rendered as its own dir="ltr" element below —
  // never inlined into this Hebrew string, or the bidi algorithm flips it to end–start on screen.
  const monthLabel = `${MONTH_NAMES_HE[month]} ${year}`;

  // Gate the fetch on the tax profile (which holds the pay-period start day) so a custom-period
  // user never sees a calendar-month window's report for a frame.
  const { data: shifts = [], isLoading: loadingShifts } = useShiftsForRange(period.start, period.end, !!taxProfile);

  const fullSummary = useMemo(() => {
    if (!taxProfile || workplaces.length === 0) return null;
    return computeMonthSummary(workplaces, shifts, taxProfile);
  }, [workplaces, shifts, taxProfile]);

  // An unknown or archived id falls back to the unfiltered report rather than an empty screen,
  // so filteredWorkplace is derived from what actually survived the filter.
  const summary = useMemo(
    () => (fullSummary ? filterSummaryToWorkplace(fullSummary, workplaceFilter) : null),
    [fullSummary, workplaceFilter]
  );
  const filteredWorkplace =
    summary && summary.byWorkplace.length === 1 && workplaceFilter === summary.byWorkplace[0].workplace.id
      ? summary.byWorkplace[0].workplace
      : null;
  const isFiltered = !!filteredWorkplace;
  // The tax caveat only applies when there is more than one employer to coordinate between.
  const hasMultipleWorkplaces = (fullSummary?.byWorkplace.length ?? 0) > 1;

  const reportShifts = useMemo(
    () => (filteredWorkplace ? shifts.filter((s) => s.workplace_id === filteredWorkplace.id) : shifts),
    [shifts, filteredWorkplace]
  );

  const isLoading = loadingWorkplaces || loadingShifts;

  // Per-workplace payslip estimates for the comparison card — one payslip per employer.
  const payslipWorkplaces = useMemo<PayslipWorkplace[]>(() => {
    if (!summary || !taxProfile) return [];
    const profile = taxProfileRowToTaxProfile(taxProfile);
    return summary.byWorkplace.map(({ workplace, gross }) => ({
      id: workplace.id,
      name: workplace.name,
      color: workplace.color,
      expected: expectedForWorkplace(gross, profile),
    }));
  }, [summary, taxProfile]);

  // The sanctioned per-employer figure: computed "as if this were the person's only income",
  // exact for a single-job user and an estimate for a multi-job one (see payslipCompare).
  const workplaceExpected = useMemo(() => {
    if (!filteredWorkplace || !summary || !taxProfile) return null;
    const entry = summary.byWorkplace[0];
    return expectedForWorkplace(entry.gross, taxProfileRowToTaxProfile(taxProfile));
  }, [filteredWorkplace, summary, taxProfile]);

  async function handleExportExcel() {
    if (!summary) return;
    setExporting(true);
    setExportError(null);
    try {
      // Lazy-loaded: exceljs is ~260kB gzipped and would otherwise download just to view this
      // page, even for users who never export.
      const { buildMonthlyReportWorkbook, downloadWorkbook } = await import('@/lib/export/excelExport');
      const workbook = await buildMonthlyReportWorkbook(summary, reportShifts, monthLabel);
      const suffix = filteredWorkplace ? `-${filteredWorkplace.name}` : '';
      await downloadWorkbook(workbook, `clockly-${year}-${String(month + 1).padStart(2, '0')}${suffix}.xlsx`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'הייצוא נכשל, נסה/י שוב');
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <h1 className="pt-1 text-center text-lg font-bold">דוחות וייצוא</h1>

        <MonthNavigator
          year={year}
          month={month}
          onChange={setPeriod}
          subLabel={
            startDay !== 1 ? (
              <span className="text-xs text-black/40 dark:text-white/40" dir="ltr">
                {payPeriodRangeLabel(period)}
              </span>
            ) : undefined
          }
        />

        {filteredWorkplace && (
          <div className="flex items-center justify-between rounded-2xl bg-brand-500/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: filteredWorkplace.color }} />
              <span className="text-sm font-medium">מסונן: {filteredWorkplace.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: true })}
              aria-label="הצגת כל מקומות העבודה"
              className="flex h-11 w-11 items-center justify-center rounded-full text-black/50 dark:text-white/50"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={handleExportExcel} disabled={!summary || exporting}>
            <FileSpreadsheet size={16} /> ייצוא ל-Excel
          </Button>
          <Button variant="secondary" fullWidth onClick={() => window.print()} disabled={!summary}>
            <Printer size={16} /> ייצוא ל-PDF
          </Button>
        </div>
        <p className="-mt-2 text-xs text-black/40 dark:text-white/40">
          ייצוא PDF פותח את תפריט ההדפסה של הדפדפן — בחרו &quot;שמירה כ-PDF&quot; כדי לשמור קובץ.
        </p>
        {exportError && <p className="-mt-2 text-sm text-red-500">{exportError}</p>}

        {isLoading ? (
          <Card>
            <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
          </Card>
        ) : !summary ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="text-black/20 dark:text-white/20" size={32} />
            <p className="text-sm text-black/50 dark:text-white/50">אין נתונים לחודש זה</p>
          </Card>
        ) : (
          <>
          <div className="print-report flex flex-col gap-4">
            <h2 className="hidden text-xl font-bold print:block">
              דוח משכורת — {monthLabel}
              {filteredWorkplace ? ` — ${filteredWorkplace.name}` : ''}
            </h2>

            {/* The same itemized breakdown the shifts screen's summary sheet renders. The old
                report stopped at gross + statutory deductions, so bonuses, tips, meal deductions,
                overtime and Shabbat pay never appeared. showByWorkplace is off because the
                per-workplace shift tables directly below already break the month down by employer.
                When filtered to one workplace the aggregate deductions are suppressed — they are
                computed across every employer and would be meaningless beside one job's gross. */}
            <MonthSummaryDetails summary={summary} showByWorkplace={false} showDeductions={!isFiltered} />

            {isFiltered && workplaceExpected && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-black/60 dark:text-white/60">
                  אומדן תלוש למקום עבודה זה
                </h2>
                <SummaryRow label="מס הכנסה" value={-workplaceExpected.income_tax} />
                <SummaryRow label="ביטוח לאומי" value={-workplaceExpected.national_insurance} />
                <SummaryRow label="דמי בריאות" value={-workplaceExpected.health_tax} />
                <SummaryRow label="פנסיה" value={-workplaceExpected.pension} />
                <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm font-bold dark:border-white/10">
                  <span>נטו לתשלום</span>
                  <span>{formatCurrency(workplaceExpected.net)}</span>
                </div>
                {hasMultipleWorkplaces && (
                  <p className="mt-3 rounded-2xl bg-black/[0.03] px-3 py-2 text-xs text-black/50 dark:bg-white/[0.04] dark:text-white/50">
                    מדרגות המס ותקרת הביטוח הלאומי משותפות לכל המעסיקים, ולכן זהו אומדן שמחושב כאילו
                    זו ההכנסה היחידה — הניכוי בפועל תלוי בתיאום המס שלך. הנטו המשולב לחודש מופיע
                    בדוח ללא הסינון.
                  </p>
                )}
              </Card>
            )}

            {summary.byWorkplace.map(({ workplace, gross }) => (
              <Card key={workplace.id} className="overflow-x-auto">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workplace.color }} />
                  <h2 className="text-sm font-semibold">{workplace.name}</h2>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-black/40 dark:text-white/40">
                      <th className="py-1 text-start font-medium">תאריך</th>
                      <th className="py-1 text-start font-medium">סוג יום</th>
                      <th className="py-1 text-start font-medium">שעות</th>
                      <th className="py-1 text-start font-medium">סה&quot;כ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...gross.shiftResults]
                      .map((shift) => {
                        const row = reportShifts.find((s) => s.id === shift.shiftId);
                        return { shift, date: row?.date ?? '', dayType: row?.day_type };
                      })
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(({ shift, date, dayType }) => (
                        <tr key={shift.shiftId} className="border-t border-black/5 dark:border-white/10">
                          {/* dir="ltr" on the number only — putting it on the <td> would also flip
                              the cell's alignment to the left, colliding the date into the next column. */}
                          <td className="py-1.5 text-start">
                            <span dir="ltr">
                              {date ? new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : ''}
                            </span>
                          </td>
                          <td className="py-1.5 text-start">
                            {dayType ? DAY_TYPE_LABELS_HE[dayType as keyof typeof DAY_TYPE_LABELS_HE] : ''}
                          </td>
                          <td className="py-1.5">{shift.hours.payableHours.toFixed(1)}</td>
                          <td className="py-1.5 font-medium">{formatCurrency(shift.totalGross)}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-black/10 font-semibold dark:border-white/10">
                      <td className="py-1.5" colSpan={2}>
                        סה&quot;כ
                      </td>
                      <td className="py-1.5">{gross.totalHours.toFixed(1)}</td>
                      <td className="py-1.5">{formatCurrency(gross.totalGross)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>
            ))}
          </div>
          {/* Outside .print-report so it stays on screen only, not in the exported PDF. */}
          <PayslipCompareCard workplaces={payslipWorkplaces} year={year} month={month + 1} />
          </>
        )}
      </div>
    </PageTransition>
  );
}
