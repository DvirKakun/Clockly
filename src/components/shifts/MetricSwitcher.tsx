import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SHIFT_METRIC_LABELS_HE, cycleShiftMetric, type ShiftMetric } from '@/lib/shiftMetrics';

/**
 * Cycles which number the shifts list and calendar display. One control drives both views, so
 * switching to hours in the list and toggling to the calendar keeps showing hours.
 *
 * Arrow direction follows the app's existing RTL convention (see MonthNavigator): in a
 * right-to-left layout "next" advances leftward, so the left-pointing chevron moves forward and
 * the right-pointing one moves back. Matching the established convention matters more than any
 * abstract argument — two controls on the same screen disagreeing would be worse than either
 * choice.
 */
export function MetricSwitcher({
  metric,
  onChange,
}: {
  metric: ShiftMetric;
  onChange: (metric: ShiftMetric) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="text-xs text-black/40 dark:text-white/40">מוצג:</span>

      <button
        type="button"
        onClick={() => onChange(cycleShiftMetric(metric, -1))}
        aria-label="המדד הקודם"
        className="flex h-11 w-11 items-center justify-center rounded-full text-black/50 active:bg-black/5 dark:text-white/50 dark:active:bg-white/10"
      >
        <ChevronRight size={16} />
      </button>

      {/* A live region so the change is announced — the value it labels is spread across every
          row and cell, which a screen reader would otherwise not connect to this control. */}
      <span
        aria-live="polite"
        className="min-w-[7.5rem] text-center text-sm font-semibold text-brand-600 dark:text-brand-400"
      >
        {SHIFT_METRIC_LABELS_HE[metric]}
      </span>

      <button
        type="button"
        onClick={() => onChange(cycleShiftMetric(metric, 1))}
        aria-label="המדד הבא"
        className="flex h-11 w-11 items-center justify-center rounded-full text-black/50 active:bg-black/5 dark:text-white/50 dark:active:bg-white/10"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}
