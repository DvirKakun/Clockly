import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, LogIn, LogOut, Shield, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MonthNavigator } from '@/components/ui/MonthNavigator';
import { useWorkplaces } from '@/hooks/useWorkplaces';
import { useShiftsForRange, useClockIn, useClockOut, useOpenShift } from '@/hooks/useShifts';
import { useTaxProfile } from '@/hooks/useTaxProfile';
import { computeMonthSummary } from '@/lib/calc/monthSummary';
import { PageTransition } from '@/components/layout/PageTransition';
import { formatCurrency } from '@/lib/format';
import { payPeriodRange, payPeriodRangeLabel } from '@/lib/payPeriod';

export function DashboardPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const { data: workplaces = [], isLoading: loadingWorkplaces } = useWorkplaces();
  const { data: taxProfile } = useTaxProfile();
  const { data: openShift } = useOpenShift();
  const clockIn = useClockIn();
  const clockOut = useClockOut();

  // The pay-period start day lives on the tax profile, so don't fetch shifts (which would use a
  // calendar-month fallback range) until it's loaded — otherwise a custom-period user would see
  // the wrong window's totals for a frame. Gate the query on the tax profile being present.
  const startDay = taxProfile?.pay_period_start_day ?? 1;
  const period = payPeriodRange(cursor.year, cursor.month, startDay);
  const { data: shifts = [], isLoading: loadingShifts } = useShiftsForRange(
    period.start,
    period.end,
    !!taxProfile
  );

  const summary = useMemo(() => {
    if (!taxProfile || workplaces.length === 0) return null;
    return computeMonthSummary(workplaces, shifts, taxProfile);
  }, [workplaces, shifts, taxProfile]);

  // `!taxProfile` keeps the loading state up while the tax profile (and thus the correct
  // pay-period range) resolves, instead of briefly falling through to the empty/summary branch.
  const isLoading = loadingWorkplaces || loadingShifts || !taxProfile;

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <MonthNavigator
          year={cursor.year}
          month={cursor.month}
          onChange={(year, month) => setCursor({ year, month })}
          subLabel={
            startDay !== 1 ? (
              <span className="text-xs text-black/40 dark:text-white/40" dir="ltr">
                {payPeriodRangeLabel(period)}
              </span>
            ) : undefined
          }
        />

        {workplaces.length > 0 && (
          <ClockCard
            workplaces={workplaces}
            openShift={openShift ?? null}
            onClockIn={(id) => clockIn.mutate(id)}
            onClockOut={() => openShift && clockOut.mutate(openShift)}
            pending={clockIn.isPending || clockOut.isPending}
          />
        )}

        {isLoading ? (
          <Card>
            <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
          </Card>
        ) : workplaces.length === 0 ? (
          <Card className="text-center">
            <p className="mb-3 text-sm text-black/60 dark:text-white/60">
              עדיין לא הוספת מקום עבודה. הוסיפו מקום עבודה כדי להתחיל לעקוב אחרי שעות ושכר.
            </p>
            <Button onClick={() => (window.location.href = '/workplaces')}>הוספת מקום עבודה</Button>
          </Card>
        ) : summary ? (
          <>
            <motion.div layout>
              <Card className="bg-gradient-to-br from-brand-500 to-accent-cyan text-white">
                <p className="text-sm opacity-80">שכר נטו משוער לחודש</p>
                <p className="mt-1 text-4xl font-bold">{formatCurrency(summary.takeHomePay)}</p>
                <div className="mt-4 flex justify-between text-sm opacity-90">
                  <span>ברוטו: {formatCurrency(summary.totalGross)}</span>
                  <span>{summary.byWorkplace.reduce((s, w) => s + w.gross.totalHours, 0).toFixed(1)} שעות</span>
                </div>
              </Card>
            </motion.div>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-black/60 dark:text-white/60">פירוט ניכויים</h2>
              <DeductionRow label="מס הכנסה" value={summary.net.incomeTax} />
              <DeductionRow label="ביטוח לאומי" value={summary.net.nationalInsurance} />
              <DeductionRow label="דמי בריאות" value={summary.net.healthTax} />
              {summary.net.pensionEmployee > 0 && <DeductionRow label="פנסיה" value={summary.net.pensionEmployee} />}
              {summary.net.kerenHishtalmutEmployee > 0 && (
                <DeductionRow label="קרן השתלמות" value={summary.net.kerenHishtalmutEmployee} />
              )}
              <div className="mt-2 border-t border-black/5 pt-2 text-xs text-black/40 dark:border-white/10 dark:text-white/40">
                {summary.net.creditPoints.toFixed(2)} נקודות זיכוי ({formatCurrency(summary.net.creditPointsValue)})
              </div>
            </Card>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-black/60 dark:text-white/60">לפי מקום עבודה</h2>
              {summary.byWorkplace.map(({ workplace, gross }) => (
                <Card key={workplace.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workplace.color }} />
                      <span className="font-medium">{workplace.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(gross.totalGross)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50 dark:text-white/50">
                    <span>{gross.totalHours.toFixed(1)} שעות</span>
                    {gross.overtimePay > 0 && <span>נוספות: {formatCurrency(gross.overtimePay)}</span>}
                    {gross.shabbatPay > 0 && <span>שבת/חג: {formatCurrency(gross.shabbatPay)}</span>}
                  </div>
                </Card>
              ))}
            </div>

            <button onClick={() => navigate('/rights')} className="text-start">
              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield size={18} className="text-brand-500" />
                  <span className="text-sm font-semibold">זכויות עובד</span>
                </div>
                <ChevronRight size={16} className="rotate-180 text-black/30 dark:text-white/30" />
              </Card>
            </button>

            <button onClick={() => navigate('/reports')} className="text-start">
              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText size={18} className="text-brand-500" />
                  <span className="text-sm font-semibold">דוחות וייצוא</span>
                </div>
                <ChevronRight size={16} className="rotate-180 text-black/30 dark:text-white/30" />
              </Card>
            </button>
          </>
        ) : null}
      </div>
    </PageTransition>
  );
}

function DeductionRow({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-black/60 dark:text-white/60">{label}</span>
      <span className="font-medium text-red-500">-{formatCurrency(value)}</span>
    </div>
  );
}

function ClockCard({
  workplaces,
  openShift,
  onClockIn,
  onClockOut,
  pending,
}: {
  workplaces: { id: string; name: string; color: string }[];
  openShift: { workplace_id: string; clock_in_at: string | null } | null;
  onClockIn: (workplaceId: string) => void;
  onClockOut: () => void;
  pending: boolean;
}) {
  if (openShift) {
    const workplace = workplaces.find((w) => w.id === openShift.workplace_id);
    const since = openShift.clock_in_at
      ? new Date(openShift.clock_in_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <Card className="border-brand-300 bg-brand-50 dark:bg-brand-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
            </span>
            <div>
              <p className="text-sm font-semibold">{workplace?.name ?? 'במשמרת'}</p>
              <p className="text-xs text-black/50 dark:text-white/50">נכנס/ה בשעה {since}</p>
            </div>
          </div>
          <Button variant="danger" onClick={onClockOut} disabled={pending}>
            <LogOut size={16} /> יציאה
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <Clock size={18} className="text-brand-500" />
        <span className="text-sm font-semibold">שעון נוכחות</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {workplaces.map((w) => (
          <Button key={w.id} variant="secondary" onClick={() => onClockIn(w.id)} disabled={pending}>
            <LogIn size={16} /> {w.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
