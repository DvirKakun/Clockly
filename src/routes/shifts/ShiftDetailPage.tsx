import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Clock, Coffee, FileQuestion, Moon, Pencil, StickyNote } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { ShiftDayPager } from '@/components/shifts/ShiftDayPager';
import { useShift, useShiftsForRange } from '@/hooks/useShifts';
import { useAllWorkplaces } from '@/hooks/useWorkplaces';
import { useTaxProfile } from '@/hooks/useTaxProfile';
import { useHorizontalSwipe } from '@/hooks/useHorizontalSwipe';
import { useGoBack } from '@/hooks/useGoBack';
import { computeShiftGross } from '@/lib/calc/grossEngine';
import { shiftRowToInput, workplaceToRateProfile } from '@/lib/calc/adapters';
import { buildShiftBreakdown } from '@/lib/shiftBreakdown';
import { resolveShiftNeighbours } from '@/lib/shiftNavigation';
import { formatCurrency } from '@/lib/format';
import { payPeriodRange } from '@/lib/payPeriod';
import { usePeriodStore } from '@/store/periodStore';
import { DAY_TYPE_LABELS_HE } from '@/lib/labels';
import { formatDayLabel } from '@/lib/date';

/**
 * What a shift *earned*, rather than the fields it was entered with.
 *
 * Tapping a shift used to open the edit form, which answers a different question than the one the
 * user has — it shows times and a bonus amount, not payable hours after breaks, which hours were
 * paid at a premium, or what the day came to. Editing now lives one deliberate tap away.
 */
export function ShiftDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // Back to wherever this was opened from — the shifts list or the report — with a fallback
  // for a deep link, where there is no in-app history to consume.
  const goBack = useGoBack('/shifts');

  const { data: shift, isError } = useShift(id);
  const { data: workplaces = [] } = useAllWorkplaces();
  const { data: taxProfile } = useTaxProfile();

  // Neighbours come from the shifts already cached for the selected period — the same query the
  // shifts screen runs, so paging resolves from cache and costs no fetch.
  const year = usePeriodStore((s) => s.year);
  const month = usePeriodStore((s) => s.month);
  const period = payPeriodRange(year, month, taxProfile?.pay_period_start_day ?? 1);
  const { data: periodShifts = [] } = useShiftsForRange(period.start, period.end, !!taxProfile);
  const neighbours = useMemo(() => resolveShiftNeighbours(periodShifts, id), [periodShifts, id]);

  const workplace = workplaces.find((w) => w.id === shift?.workplace_id);

  const breakdown = useMemo(() => {
    if (!shift || !workplace) return null;
    const input = shiftRowToInput(shift);
    // Null for an open (clocked-in, not yet ended) shift — it can't be costed yet.
    if (!input) return null;
    return buildShiftBreakdown(computeShiftGross(input, workplaceToRateProfile(workplace)));
  }, [shift, workplace]);

  const swipeHandlers = useHorizontalSwipe({
    onSwipeForward: () => neighbours.next && navigate(`/shifts/${neighbours.next.id}`, { replace: true }),
    onSwipeBack: () => neighbours.previous && navigate(`/shifts/${neighbours.previous.id}`, { replace: true }),
  });

  // useShift queries with .single(), which errors when the row is gone — a deep link to a deleted
  // shift, or a stale link after deleting one. Without this branch that state renders "loading"
  // forever, since `data` simply stays undefined.
  if (isError && !shift) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-4">
          <DetailHeader onBack={goBack} />
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <FileQuestion className="text-black/20 dark:text-white/20" size={32} />
            <p className="text-sm text-black/60 dark:text-white/60">המשמרת לא נמצאה — ייתכן שנמחקה.</p>
            <Button variant="secondary" onClick={() => navigate('/shifts')}>
              חזרה למשמרות
            </Button>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (!shift) {
    return (
      <PageTransition>
        <div className="flex flex-col gap-4">
          <DetailHeader onBack={goBack} />
          <p className="py-12 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
        </div>
      </PageTransition>
    );
  }

  const isOpen = !shift.end_time;

  return (
    <PageTransition>
      <div className="flex flex-col gap-4" {...swipeHandlers}>
        <DetailHeader onBack={goBack} />

        <ShiftDayPager
          neighbours={neighbours}
          currentDate={shift.date}
          onNavigate={(shiftId) => navigate(`/shifts/${shiftId}`, { replace: true })}
        />

        <Card>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="h-9 w-1.5 rounded-full"
                style={{ backgroundColor: workplace?.color ?? '#999' }}
              />
              <div>
                <p className="font-semibold">{workplace?.name ?? 'לא ידוע'}</p>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {formatDayLabel(shift.date)}
                </p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-sm font-medium" dir="ltr">
                {shift.start_time.slice(0, 5)} – {shift.end_time ? shift.end_time.slice(0, 5) : '...'}
              </p>
              <p className="text-xs text-black/50 dark:text-white/50">
                {DAY_TYPE_LABELS_HE[shift.day_type as keyof typeof DAY_TYPE_LABELS_HE]}
              </p>
            </div>
          </div>

          {shift.crosses_midnight && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-black/[0.03] px-3 py-2 text-xs text-black/50 dark:bg-white/[0.04] dark:text-white/50">
              <Moon size={14} className="shrink-0" />
              משמרת חוצת חצות — הסתיימה ביום שאחרי
            </div>
          )}
        </Card>

        {isOpen ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <Clock className="text-brand-500" size={28} />
            <p className="text-sm font-medium">המשמרת עדיין פעילה</p>
            <p className="text-xs text-black/50 dark:text-white/50">
              השכר יחושב לאחר יציאה מהמשמרת.
            </p>
          </Card>
        ) : !breakdown ? (
          <Card className="py-8 text-center text-sm text-black/40 dark:text-white/40">
            לא ניתן לחשב את השכר למשמרת זו — בדקו שמקום העבודה עדיין קיים ושהוגדר לו תעריף.
          </Card>
        ) : (
          <>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-black/60 dark:text-white/60">שעות</h2>
              <HoursRow label="סה&quot;כ שעות במשמרת" value={breakdown.totalHours} />
              {breakdown.paidBreakHours > 0 && (
                <HoursRow label="הפסקות בתשלום" value={breakdown.paidBreakHours} />
              )}
              {breakdown.unpaidBreakHours > 0 && (
                <HoursRow label="הפסקות ללא תשלום" value={-breakdown.unpaidBreakHours} />
              )}
              <div className="mt-2 flex items-baseline gap-2 border-t border-black/10 pt-2 text-sm font-bold dark:border-white/10">
                <span className="min-w-0 flex-1">שעות בתשלום</span>
                <span className="w-[4.5rem] shrink-0 text-end tabular-nums" dir="ltr">
                  {breakdown.payableHours.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                תעריף בסיס: {formatCurrency(breakdown.hourlyRateUsed)} לשעה
              </p>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-black/60 dark:text-white/60">פירוט שכר</h2>
              {/* Three columns, not a two-child justify-between: with the hours glued to the label
                  the row left a wide void down the middle and the hours never lined up from one
                  row to the next. The label takes the slack, and hours and money sit in fixed
                  columns with tabular figures so they align vertically. */}
              {breakdown.tiers.map((tier) => (
                <div key={tier.key} className="flex items-baseline gap-2 py-1 text-sm">
                  <span className="min-w-0 flex-1 text-black/60 dark:text-white/60">{tier.label}</span>
                  <span className="w-16 shrink-0 text-end text-xs tabular-nums text-black/40 dark:text-white/40" dir="ltr">
                    {tier.hours !== undefined ? `${tier.hours.toFixed(2)}h` : ''}
                  </span>
                  <span className="w-[4.5rem] shrink-0 text-end font-medium tabular-nums">
                    {formatCurrency(tier.amount)}
                  </span>
                </div>
              ))}

              {breakdown.adjustments.length > 0 && (
                <div className="mt-2 border-t border-black/5 pt-2 dark:border-white/10">
                  {breakdown.adjustments.map((adj) => (
                    <div key={adj.key} className="flex items-baseline gap-2 py-1 text-sm">
                      <span className="min-w-0 flex-1 text-black/60 dark:text-white/60">{adj.label}</span>
                      <span
                        className={`w-[4.5rem] shrink-0 text-end tabular-nums ${
                          adj.amount < 0 ? 'font-medium text-red-500' : 'font-medium'
                        }`}
                      >
                        {adj.amount < 0
                          ? `-${formatCurrency(Math.abs(adj.amount))}`
                          : formatCurrency(adj.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-baseline gap-2 border-t border-black/10 pt-2 text-base font-bold dark:border-white/10">
                <span className="min-w-0 flex-1">סה&quot;כ למשמרת</span>
                <span className="w-[4.5rem] shrink-0 text-end tabular-nums">{formatCurrency(breakdown.totalGross)}</span>
              </div>
            </Card>
          </>
        )}

        {shift.breaks.length > 0 && (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-black/60 dark:text-white/60">
              <Coffee size={15} /> הפסקות
            </h2>
            {shift.breaks.map((brk) => (
              <div key={brk.id} className="flex justify-between py-1 text-sm">
                <span dir="ltr" className="text-black/60 dark:text-white/60">
                  {brk.start_time.slice(0, 5)} – {brk.end_time.slice(0, 5)}
                </span>
                <span className="text-xs text-black/40 dark:text-white/40">
                  {brk.is_paid ? 'בתשלום' : 'ללא תשלום'}
                </span>
              </div>
            ))}
          </Card>
        )}

        {shift.notes && (
          <Card>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-black/60 dark:text-white/60">
              <StickyNote size={15} /> הערות
            </h2>
            <p className="text-sm text-black/70 dark:text-white/70">{shift.notes}</p>
          </Card>
        )}

        <Button fullWidth onClick={() => navigate(`/shifts/${shift.id}/edit`)}>
          <Pencil size={16} /> עריכת המשמרת
        </Button>
      </div>
    </PageTransition>
  );
}

function DetailHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center gap-3 pt-1">
      <button
        onClick={onBack}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
        aria-label="חזרה"
      >
        <ChevronRight size={18} />
      </button>
      <h1 className="text-lg font-bold">סיכום משמרת</h1>
    </header>
  );
}

function HoursRow({ label, value }: { label: string; value: number }) {
  const isNegative = value < 0;
  return (
    <div className="flex items-baseline gap-2 py-1 text-sm">
      <span className="min-w-0 flex-1 text-black/60 dark:text-white/60">{label}</span>
      <span
        className={`w-[4.5rem] shrink-0 text-end tabular-nums ${isNegative ? 'font-medium text-red-500' : 'font-medium'}`}
        dir="ltr"
      >
        {isNegative ? '-' : ''}
        {Math.abs(value).toFixed(2)}
      </span>
    </div>
  );
}
