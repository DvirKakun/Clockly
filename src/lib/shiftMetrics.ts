import { formatCurrency } from './format';
import type { ShiftGrossResult } from './calc/types';

/**
 * The vocabulary for "which number is shown for a shift" — shared by the shifts list and the
 * calendar grid so the two views can never disagree about what a metric means or how it reads.
 *
 * A shift row used to show exactly one number (total pay) and a calendar cell showed none at all,
 * so answering "which shifts were long?", "which carried a bonus?" or "was this priced at the
 * right rate?" meant opening every shift in turn. Cycling one metric across the whole month lets
 * the user scan a single column instead.
 */
export type ShiftMetric = 'pay' | 'hours' | 'extras' | 'rate';

/** Cycle order. `pay` is first because it is the default and the common case. */
export const SHIFT_METRICS: readonly ShiftMetric[] = ['pay', 'hours', 'extras', 'rate'] as const;

export const SHIFT_METRIC_LABELS_HE: Record<ShiftMetric, string> = {
  pay: 'שכר',
  hours: 'שעות',
  extras: 'בונוסים וטיפים',
  rate: 'תעריף',
};

/** Shown in a calendar cell when a day's shifts were paid at different rates — summing rates is
 *  meaningless, so the cell says "not one number" rather than inventing one. */
export const MIXED_RATE_DISPLAY = '—';

/** Steps through the metrics, wrapping, so any metric is reachable from any other. */
export function cycleShiftMetric(metric: ShiftMetric, direction: 1 | -1): ShiftMetric {
  const index = SHIFT_METRICS.indexOf(metric);
  const from = index === -1 ? 0 : index;
  const next = (from + direction + SHIFT_METRICS.length) % SHIFT_METRICS.length;
  return SHIFT_METRICS[next];
}

/** Reads a persisted metric, falling back to `pay` for anything unrecognised. */
export function parseShiftMetric(value: string | null): ShiftMetric {
  return SHIFT_METRICS.includes(value as ShiftMetric) ? (value as ShiftMetric) : 'pay';
}

/** The raw number behind a metric for one shift. */
export function shiftMetricValue(metric: ShiftMetric, gross: ShiftGrossResult): number {
  switch (metric) {
    case 'pay':
      return gross.totalGross;
    case 'hours':
      return gross.hours.payableHours;
    case 'extras':
      return gross.bonuses + gross.tips;
    case 'rate':
      // The engine derives an effective hourly rate even for monthly-salaried workplaces
      // (salary ÷ the monthly hour divisor), so this column is meaningful for them too.
      return gross.hourlyRateUsed;
  }
}

function formatHours(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

/**
 * Compact money for a calendar cell, which is far narrower than a list row: thousands collapse to
 * "₪1.2k" so a four-figure day fits instead of being clipped.
 */
export function formatCompactCurrency(value: number): string {
  if (!Number.isFinite(value)) return '₪0';
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const thousands = (value / 1000).toFixed(1).replace(/\.0$/, '');
    return `₪${thousands}k`;
  }
  return `₪${Math.round(value)}`;
}

/** Full-precision display for one shift, as shown in the list. */
export function shiftMetricDisplay(metric: ShiftMetric, gross: ShiftGrossResult): string {
  const value = shiftMetricValue(metric, gross);
  switch (metric) {
    case 'hours':
      return `${formatHours(value)} שעות`;
    case 'rate':
      return `${formatCurrency(value)}/שעה`;
    default:
      return formatCurrency(value);
  }
}

/** True when a day's shifts were paid at more than one hourly rate. */
export function isDayRateMixed(results: ShiftGrossResult[]): boolean {
  if (results.length < 2) return false;
  const first = results[0].hourlyRateUsed;
  return results.some((r) => Math.abs(r.hourlyRateUsed - first) >= 0.005);
}

/**
 * Compact display for a whole day, as shown in a calendar cell. Returns null for a day with no
 * shifts so the cell renders only its date.
 *
 * Values are summed across the day's shifts — the cell describes the day, not one arbitrary shift
 * — except `rate`, which cannot meaningfully be summed.
 */
export function dayMetricDisplay(metric: ShiftMetric, results: ShiftGrossResult[]): string | null {
  if (results.length === 0) return null;

  if (metric === 'rate') {
    if (isDayRateMixed(results)) return MIXED_RATE_DISPLAY;
    return formatCompactCurrency(results[0].hourlyRateUsed);
  }

  const total = results.reduce((sum, r) => sum + shiftMetricValue(metric, r), 0);
  return metric === 'hours' ? formatHours(total) : formatCompactCurrency(total);
}

/** Spoken form for a day cell, so the value isn't conveyed by position alone. */
export function dayMetricAriaLabel(metric: ShiftMetric, results: ShiftGrossResult[]): string | null {
  if (results.length === 0) return null;
  if (metric === 'rate' && isDayRateMixed(results)) return 'תעריפים שונים';

  const total =
    metric === 'rate'
      ? results[0].hourlyRateUsed
      : results.reduce((sum, r) => sum + shiftMetricValue(metric, r), 0);

  switch (metric) {
    case 'hours':
      return `${formatHours(total)} שעות`;
    case 'rate':
      return `${formatCurrency(total)} לשעה`;
    case 'extras':
      return `בונוסים וטיפים ${formatCurrency(total)}`;
    default:
      return formatCurrency(total);
  }
}
