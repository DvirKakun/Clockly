import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WEEKDAY_NAMES_HE } from '@/lib/date';
import type { ShiftNeighbours } from '@/lib/shiftNavigation';

function dayLabel(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAY_NAMES_HE[date.getDay()]}, ${date.toLocaleDateString('he-IL')}`;
}

/**
 * Moves between the shifts of the loaded month from inside the shift screen, so reviewing a month
 * doesn't mean exiting and re-entering for every shift.
 *
 * The arrows exist because the swipe gesture is invisible and unreachable by keyboard — the
 * gesture is the shortcut, not the interface. Each arrow names the date it leads to, so skipping
 * over days with no shifts is visible rather than silent. Direction follows the app's RTL
 * convention (MonthNavigator, MetricSwitcher): the left chevron advances.
 */
export function ShiftDayPager({
  neighbours,
  currentDate,
  onNavigate,
}: {
  neighbours: ShiftNeighbours;
  currentDate: string;
  onNavigate: (shiftId: string) => void;
}) {
  const { previous, next, position, total } = neighbours;

  // Nothing to page to — a single-shift month, or a shift opened outside the loaded range.
  if (!previous && !next) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-black/[0.03] px-1 py-1 dark:bg-white/[0.04]">
      <PagerButton
        target={previous}
        label="המשמרת הקודמת"
        onNavigate={onNavigate}
        icon={<ChevronRight size={18} />}
      />

      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-black/60 dark:text-white/60">{dayLabel(currentDate)}</span>
        {position !== null && (
          <span className="text-[11px] text-black/35 dark:text-white/35">
            {position} מתוך {total}
          </span>
        )}
      </div>

      <PagerButton target={next} label="המשמרת הבאה" onNavigate={onNavigate} icon={<ChevronLeft size={18} />} />
    </div>
  );
}

function PagerButton({
  target,
  label,
  icon,
  onNavigate,
}: {
  target: { id: string; date: string } | null;
  label: string;
  icon: React.ReactNode;
  onNavigate: (shiftId: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={!target}
      onClick={() => target && onNavigate(target.id)}
      aria-label={target ? `${label} — ${dayLabel(target.date)}` : `${label} (אין)`}
      className="flex h-11 w-11 items-center justify-center rounded-full text-black/50 disabled:opacity-25 dark:text-white/50"
    >
      {icon}
    </button>
  );
}
