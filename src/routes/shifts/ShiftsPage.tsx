import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CalendarClock, Calendar, List, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageTransition } from '@/components/layout/PageTransition';
import { useShiftsForRange, type ShiftWithBreaks } from '@/hooks/useShifts';
import { useWorkplaces, type Workplace } from '@/hooks/useWorkplaces';
import { computeShiftGross } from '@/lib/calc/grossEngine';
import { shiftRowToInput, workplaceToRateProfile } from '@/lib/calc/adapters';
import { isStatutoryHolidayDate } from '@/lib/calc';
import { formatCurrency } from '@/lib/format';
import { getMonthGridDays } from '@/lib/calendarGrid';
import {
  todayIso,
  monthRange,
  MONTH_NAMES_HE as monthNames,
  WEEKDAY_NAMES_HE as weekdayNames,
  WEEKDAY_SHORT_HE as weekdayShort,
} from '@/lib/date';

type ViewMode = 'calendar' | 'list';
const VIEW_STORAGE_KEY = 'clockly-shifts-view';

export function ShiftsPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || 'calendar'
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { start, end } = monthRange(cursor.year, cursor.month);

  const { data: shifts = [], isLoading } = useShiftsForRange(start, end);
  const { data: workplaces = [] } = useWorkplaces();

  const workplaceMap = useMemo(() => new Map(workplaces.map((w) => [w.id, w])), [workplaces]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftWithBreaks[]>();
    for (const shift of shifts) {
      const list = map.get(shift.date) ?? [];
      list.push(shift);
      map.set(shift.date, list);
    }
    return map;
  }, [shifts]);

  const grouped = useMemo(
    () => [...shiftsByDate.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    [shiftsByDate]
  );

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_STORAGE_KEY, mode);
  }

  function changeMonth(delta: 1 | -1) {
    setSelectedDate(null);
    setCursor((c) => {
      const m = c.month + delta;
      if (m < 0) return { year: c.year - 1, month: 11 };
      if (m > 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: m };
    });
  }

  const selectedDayShifts = selectedDate ? (shiftsByDate.get(selectedDate) ?? []) : [];

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
          <h1 className="text-lg font-bold">
            {monthNames[cursor.month]} {cursor.year}
          </h1>
          <button
            onClick={() => changeMonth(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            aria-label="חודש הבא"
          >
            <ChevronLeft size={18} />
          </button>
        </header>

        <div className="flex justify-center gap-1 rounded-2xl bg-black/5 p-1 dark:bg-white/10">
          <button
            onClick={() => changeView('calendar')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-colors ${
              viewMode === 'calendar' ? 'bg-white shadow-sm dark:bg-white/15' : 'text-black/50 dark:text-white/50'
            }`}
          >
            <Calendar size={16} /> לוח שנה
          </button>
          <button
            onClick={() => changeView('list')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white shadow-sm dark:bg-white/15' : 'text-black/50 dark:text-white/50'
            }`}
          >
            <List size={16} /> רשימה
          </button>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-black/40 dark:text-white/40">טוען...</p>
        ) : viewMode === 'calendar' ? (
          <>
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              shiftsByDate={shiftsByDate}
              workplaceMap={workplaceMap}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {selectedDate && (
              <SelectedDayPanel
                date={selectedDate}
                dayShifts={selectedDayShifts}
                workplaceMap={workplaceMap}
                onOpenShift={(id) => navigate(`/shifts/${id}/edit`)}
                onAddShift={() => navigate('/shifts/new', { state: { date: selectedDate } })}
              />
            )}
          </>
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
                  {dayShifts.map((shift) => (
                    <ShiftRow
                      key={shift.id}
                      shift={shift}
                      workplace={workplaceMap.get(shift.workplace_id)}
                      onClick={() => navigate(`/shifts/${shift.id}/edit`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function ShiftRow({
  shift,
  workplace,
  onClick,
}: {
  shift: ShiftWithBreaks;
  workplace: Workplace | undefined;
  onClick: () => void;
}) {
  const input = shiftRowToInput(shift);
  const gross = workplace && input ? computeShiftGross(input, workplaceToRateProfile(workplace)) : null;
  return (
    <button onClick={onClick} className="text-start">
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-9 w-1.5 rounded-full" style={{ backgroundColor: workplace?.color ?? '#999' }} />
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
}

function MonthGrid({
  year,
  month,
  shiftsByDate,
  workplaceMap,
  selectedDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  shiftsByDate: Map<string, ShiftWithBreaks[]>;
  workplaceMap: Map<string, Workplace>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const days = useMemo(() => getMonthGridDays(year, month), [year, month]);
  const today = todayIso();

  // A true 44px touch target per cell isn't physically achievable in a 7-column grid on the
  // narrowest supported phones (360px) with any reasonable margins — even zero padding only
  // just clears it. Padding/gap are trimmed as far as reasonable and accepted below that on
  // the smallest screens; dense calendar grids are a recognized standard exception to the
  // guideline (the same tradeoff Apple/Google's own calendar apps make), unlike an isolated
  // icon-only button, which has no such physical constraint.
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-black/5 bg-white p-2.5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-black/40 dark:text-white/40">
        {weekdayShort.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const dow = new Date(day.iso).getDay();
          const isShabbatDay = dow === 5 || dow === 6;
          const isHoliday = isStatutoryHolidayDate(day.iso);
          const dayShifts = shiftsByDate.get(day.iso) ?? [];
          const isSelected = selectedDate === day.iso;
          const isToday = day.iso === today;

          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => onSelectDate(day.iso)}
              disabled={!day.isCurrentMonth}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition-colors ${
                !day.isCurrentMonth
                  ? 'text-black/15 dark:text-white/15'
                  : isSelected
                    ? 'bg-brand-500 text-white'
                    : isHoliday || isShabbatDay
                      ? 'bg-brand-50 text-black/80 dark:bg-brand-500/10 dark:text-white/80'
                      : 'text-black/70 dark:text-white/70'
              }`}
            >
              <span className={isToday && !isSelected ? 'font-bold text-brand-500' : ''}>{day.dayOfMonth}</span>
              {dayShifts.length > 0 && (
                <span className="flex gap-0.5">
                  {dayShifts.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? 'white' : (workplaceMap.get(s.workplace_id)?.color ?? '#999') }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedDayPanel({
  date,
  dayShifts,
  workplaceMap,
  onOpenShift,
  onAddShift,
}: {
  date: string;
  dayShifts: ShiftWithBreaks[];
  workplaceMap: Map<string, Workplace>;
  onOpenShift: (id: string) => void;
  onAddShift: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium text-black/40 dark:text-white/40">
          {weekdayNames[new Date(date).getDay()]}, {new Date(date).toLocaleDateString('he-IL')}
        </p>
        <button onClick={onAddShift} className="flex items-center gap-1 text-xs font-medium text-brand-500">
          <Plus size={14} /> הוספת משמרת
        </button>
      </div>
      {dayShifts.length === 0 ? (
        <Card className="py-6 text-center text-sm text-black/40 dark:text-white/40">אין משמרות ביום זה</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {dayShifts.map((shift) => (
            <ShiftRow
              key={shift.id}
              shift={shift}
              workplace={workplaceMap.get(shift.workplace_id)}
              onClick={() => onOpenShift(shift.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
