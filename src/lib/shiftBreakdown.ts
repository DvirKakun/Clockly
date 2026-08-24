import type { ShiftGrossResult } from './calc/types';

/**
 * Turns one shift's engine result into the ordered rows the shift summary renders.
 *
 * The screen it feeds exists because tapping a shift used to open an edit form — which shows the
 * *inputs* (times, a bonus amount) rather than the *results* the user actually wants: how many
 * hours were payable after breaks, which of them were paid at 125% versus 150%, and what the day
 * came to. Deriving that here rather than in the component keeps "what 150% means" in one place
 * and makes it assertable.
 */

export interface BreakdownRow {
  key: string;
  label: string;
  /** Hours at this tier; absent for rows that aren't time-based (bonuses, deductions). */
  hours?: number;
  /** Signed money. Deductions are negative. */
  amount: number;
}

export interface ShiftBreakdown {
  /** Pay tiers that actually applied, in rate order. */
  tiers: BreakdownRow[];
  /** Bonuses, tips, travel, and the deductions — whatever is non-zero. */
  adjustments: BreakdownRow[];
  totalGross: number;
  hourlyRateUsed: number;
  totalHours: number;
  payableHours: number;
  paidBreakHours: number;
  unpaidBreakHours: number;
}

/** Below this a figure is treated as absent rather than as a real zero row. */
const EPSILON = 0.005;

function row(key: string, label: string, amount: number, hours?: number): BreakdownRow | null {
  if (Math.abs(amount) < EPSILON && (hours === undefined || Math.abs(hours) < EPSILON)) return null;
  return hours === undefined ? { key, label, amount } : { key, label, amount, hours };
}

function compact(rows: (BreakdownRow | null)[]): BreakdownRow[] {
  return rows.filter((r): r is BreakdownRow => r !== null);
}

export function buildShiftBreakdown(gross: ShiftGrossResult): ShiftBreakdown {
  const h = gross.hours;

  // Only the tiers that applied. A regular weekday shift should not list five empty Shabbat rows.
  const tiers = compact([
    row('regular', 'שעות רגילות (100%)', gross.regularPay, h.regularHours),
    row('ot125', 'שעות נוספות (125%)', gross.overtime125Pay, h.overtime125Hours),
    row('ot150', 'שעות נוספות (150%)', gross.overtime150Pay, h.overtime150Hours),
    row('shabbat150', 'שבת/חג (150%)', gross.shabbatBasePay, h.shabbatBaseHours),
    row('shabbat175', 'שבת/חג + נוספות (175%)', gross.shabbatOvertime175Pay, h.shabbatOvertime175Hours),
    row('shabbat200', 'שבת/חג + נוספות (200%)', gross.shabbatOvertime200Pay, h.shabbatOvertime200Hours),
  ]);

  const adjustments = compact([
    row('bonuses', 'בונוס', gross.bonuses),
    row('tips', 'טיפים', gross.tips),
    row('travel', 'החזר נסיעות', gross.travelReimbursement),
    row('meal', 'ניכוי ארוחות', -gross.mealDeduction),
    row('other', 'ניכויים אחרים', -gross.otherDeduction),
  ]);

  return {
    tiers,
    adjustments,
    totalGross: gross.totalGross,
    hourlyRateUsed: gross.hourlyRateUsed,
    totalHours: h.totalHours,
    payableHours: h.payableHours,
    paidBreakHours: h.paidBreakHours,
    unpaidBreakHours: h.unpaidBreakHours,
  };
}

/**
 * Compact break duration for a dense report row: "45 דק'" under an hour, "1:15 שע'" above it.
 * Returns null when there were no breaks, so the caller renders nothing rather than a zero.
 */
export function formatBreakDuration(hours: number): string | null {
  if (!Number.isFinite(hours) || hours < EPSILON) return null;
  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes} דק'`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')} שע'`;
}
