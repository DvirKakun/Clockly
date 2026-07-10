import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/layout/PageTransition';
import { useShiftsForRange, type ShiftWithBreaks } from '@/hooks/useShifts';
import { useWorkplaces } from '@/hooks/useWorkplaces';
import { computeShiftGross } from '@/lib/calc/grossEngine';
import { shiftRowToInput, workplaceToRateProfile } from '@/lib/calc/adapters';
import { formatCurrency } from '@/lib/format';

const monthNames = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const weekdayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function ShiftsPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const { start, end } = monthRange(cursor.year, cursor.month);

  const { data: shifts = [], isLoading } = useShiftsForRange(start, end);
  const { data: workplaces = [] } = useWorkplaces();

  const workplaceMap = useMemo(() => new Map(workplaces.map((w) => [w.id, w])), [workplaces]);

  const grouped = useMemo(() => {
    const map = new Map<string, ShiftWithBreaks[]>();
    for (const shift of shifts) {
      const list = map.get(shift.date) ?? [];
      list.push(shift);
      map.set(shift.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [shifts]);

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חודש קודם"
          >
            <ChevronRight size={18} />
          </button>
          <h1 className="text-lg font-bold">
            {monthNames[cursor.month]} {cursor.year}
          </h1>
          <button
            onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }))}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חודש הבא"
          >
            <ChevronLeft size={18} />
          </button>
        </header>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
        ) : grouped.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarClock className="text-black/20 dark:text-white/20" size={32} />
            <p className="text-sm text-black/50 dark:text-white/50">אין משמרות בחודש זה</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map(([date, dayShifts]) => (
              <div key={date}>
                <p className="mb-1.5 px-1 text-xs font-medium text-black/40 dark:text-white/40">
                  {weekdayNames[new Date(date).getDay()]}, {new Date(date).toLocaleDateString('he-IL')}
                </p>
                <div className="flex flex-col gap-2">
                  {dayShifts.map((shift) => {
                    const workplace = workplaceMap.get(shift.workplace_id);
                    const input = shiftRowToInput(shift);
                    const gross = workplace && input ? computeShiftGross(input, workplaceToRateProfile(workplace)) : null;
                    return (
                      <button
                        key={shift.id}
                        onClick={() => navigate(`/shifts/${shift.id}/edit`)}
                        className="text-start"
                      >
                        <Card className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className="h-9 w-1.5 rounded-full"
                              style={{ backgroundColor: workplace?.color ?? '#999' }}
                            />
                            <div>
                              <p className="text-sm font-medium">{workplace?.name ?? 'לא ידוע'}</p>
                              <p className="text-xs text-black/50 dark:text-white/50" dir="ltr">
                                {shift.start_time.slice(0, 5)} – {shift.end_time ? shift.end_time.slice(0, 5) : 'פעיל'}
                              </p>
                            </div>
                          </div>
                          {gross && <span className="text-sm font-semibold">{formatCurrency(gross.totalGross)}</span>}
                        </Card>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
