/**
 * Pay-period date ranges.
 *
 * A pay period is identified by the month it "belongs to" (the month you're paid) and a
 * configurable start day. With the default start day of 1 a period is just the calendar month,
 * so existing behaviour is unchanged. With a start day D > 1, the period for month M runs from
 * the D-th of the previous month through the (D-1)-th of month M — e.g. start day 25 makes the
 * "July" period cover 25 June → 24 July, matching how many Israeli payslips are dated.
 *
 * `month` is 0-indexed (like `Date` and `monthRange`). Start day is capped at 28 at the schema
 * and UI level so it always exists in every month (no Feb-29/31 clamping needed here).
 */
import { monthRange } from './date';

export interface PayPeriod {
  start: string; // inclusive, yyyy-mm-dd
  end: string; // inclusive, yyyy-mm-dd
}

function iso(year: number, monthIndex: number, day: number): string {
  // Date.UTC normalises out-of-range month/day (e.g. monthIndex -1 → previous December,
  // day 0 → last day of the previous month), which is exactly what the boundary math relies on.
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function payPeriodRange(year: number, month: number, startDay: number): PayPeriod {
  // Default start day = plain calendar month; reuse monthRange so the two stay in lockstep.
  if (startDay <= 1) return monthRange(year, month);
  return { start: iso(year, month - 1, startDay), end: iso(year, month, startDay - 1) };
}

/** Compact "d.M – d.M" label for a period's date range, for showing under the month name. */
export function payPeriodRangeLabel({ start, end }: PayPeriod): string {
  const short = (isoDate: string) => {
    const [, m, d] = isoDate.split('-').map(Number);
    return `${d}.${m}`;
  };
  return `${short(start)} – ${short(end)}`;
}
