import { useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, FileSpreadsheet, Printer, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { useWorkplaces } from '@/hooks/useWorkplaces';
import { useShiftsForRange } from '@/hooks/useShifts';
import { useTaxProfile } from '@/hooks/useTaxProfile';
import { computeMonthSummary } from '@/lib/calc/monthSummary';
import { formatCurrency } from '@/lib/format';
import { DAY_TYPE_LABELS_HE } from '@/lib/labels';
import { MONTH_NAMES_HE, monthRange } from '@/lib/date';

export function ReportsPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { start, end } = monthRange(cursor.year, cursor.month);
  const monthLabel = `${MONTH_NAMES_HE[cursor.month]} ${cursor.year}`;

  const { data: workplaces = [], isLoading: loadingWorkplaces } = useWorkplaces();
  const { data: shifts = [], isLoading: loadingShifts } = useShiftsForRange(start, end);
  const { data: taxProfile } = useTaxProfile();

  const summary = useMemo(() => {
    if (!taxProfile || workplaces.length === 0) return null;
    return computeMonthSummary(workplaces, shifts, taxProfile);
  }, [workplaces, shifts, taxProfile]);

  const isLoading = loadingWorkplaces || loadingShifts;

  function changeMonth(delta: 1 | -1) {
    setCursor((c) => {
      const m = c.month + delta;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: m };
    });
  }

  async function handleExportExcel() {
    if (!summary) return;
    setExporting(true);
    setExportError(null);
    try {
      // Lazy-loaded: exceljs is ~260kB gzipped and would otherwise download just to view this
      // page, even for users who never export.
      const { buildMonthlyReportWorkbook, downloadWorkbook } = await import('@/lib/export/excelExport');
      const workbook = await buildMonthlyReportWorkbook(summary, shifts, monthLabel);
      await downloadWorkbook(workbook, `clockly-${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}.xlsx`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'הייצוא נכשל, נסה/י שוב');
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => changeMonth(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חודש קודם"
          >
            <ChevronRight size={18} />
          </button>
          <h1 className="text-lg font-bold">דוחות וייצוא</h1>
          <button
            onClick={() => changeMonth(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חודש הבא"
          >
            <ChevronLeft size={18} />
          </button>
        </header>

        <p className="-mt-2 text-center text-sm text-black/50 dark:text-white/50">{monthLabel}</p>

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
          <div className="print-report flex flex-col gap-4">
            <h2 className="hidden text-xl font-bold print:block">דוח משכורת — {monthLabel}</h2>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-black/60 dark:text-white/60">סיכום</h2>
              <ReportRow label="סה&quot;כ ברוטו" value={summary.totalGross} />
              <ReportRow label="מס הכנסה" value={-summary.net.incomeTax} />
              <ReportRow label="ביטוח לאומי ובריאות" value={-summary.net.socialSecurity} />
              {summary.net.pensionEmployee > 0 && <ReportRow label="פנסיה" value={-summary.net.pensionEmployee} />}
              {summary.net.kerenHishtalmutEmployee > 0 && (
                <ReportRow label="קרן השתלמות" value={-summary.net.kerenHishtalmutEmployee} />
              )}
              <ReportRow label="החזר נסיעות" value={summary.totalTravelReimbursement} />
              <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm font-bold dark:border-white/10">
                <span>סה&quot;כ לתשלום</span>
                <span>{formatCurrency(summary.takeHomePay)}</span>
              </div>
            </Card>

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
                        const row = shifts.find((s) => s.id === shift.shiftId);
                        return { shift, date: row?.date ?? '', dayType: row?.day_type };
                      })
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(({ shift, date, dayType }) => (
                        <tr key={shift.shiftId} className="border-t border-black/5 dark:border-white/10">
                          <td className="py-1.5" dir="ltr">
                            {date ? new Date(date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : ''}
                          </td>
                          <td className="py-1.5">{dayType ? DAY_TYPE_LABELS_HE[dayType as keyof typeof DAY_TYPE_LABELS_HE] : ''}</td>
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
        )}
      </div>
    </PageTransition>
  );
}

function ReportRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-black/60 dark:text-white/60">{label}</span>
      <span className={value < 0 ? 'text-red-500' : 'font-medium'}>{formatCurrency(value)}</span>
    </div>
  );
}
