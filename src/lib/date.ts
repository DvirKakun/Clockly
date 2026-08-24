export const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
export const WEEKDAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const WEEKDAY_SHORT_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export function monthRange(year: number, month: number): { start: string; end: string } {
  // Build the boundaries in UTC. Using a local-time `new Date(year, month, 1)` and then
  // `.toISOString()` shifts the date by a day in any timezone ahead of UTC (e.g. Asia/Jerusalem),
  // which silently pulled shifts into the wrong month's totals.
  const iso = (m: number, d: number) => new Date(Date.UTC(year, m, d)).toISOString().slice(0, 10);
  return { start: iso(month, 1), end: iso(month + 1, 0) };
}

/**
 * Steps a 0-indexed {year, month} cursor by whole months, rolling the year at the boundaries
 * (December + 1 → next January, January − 1 → previous December).
 *
 * Lives here rather than inline in MonthNavigator because the period cursor is now shared app-wide
 * (see periodStore) — the arithmetic has one home and one set of boundary tests.
 */
export function stepMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const absolute = year * 12 + month + delta;
  return { year: Math.floor(absolute / 12), month: ((absolute % 12) + 12) % 12 };
}

/**
 * "ראשון, 2.3.2026" — the weekday-and-date label used by the shift list, the calendar's day panel,
 * the day pager and the shift summary. Was written out at each of those call sites; one home means
 * they cannot drift apart.
 */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  return `${WEEKDAY_NAMES_HE[date.getDay()]}, ${date.toLocaleDateString('he-IL')}`;
}

export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * The date a new shift should default to, given the period the user is looking at.
 *
 * The + button used to carry no context, so the form always fell back to today — browse to March,
 * tap +, and get a form dated today. Beyond the retyping, a forgotten date change files the shift
 * under the wrong pay period and quietly changes two months' totals.
 *
 * A selected calendar day wins (the + should agree with the day panel's own add action); otherwise
 * today, if today is inside the month being viewed; otherwise the first of that month. The first
 * of month M is inside period M for every configurable start day (capped at 28), since a period
 * with start day D runs D of M-1 through D-1 of M.
 *
 * `today` is passed in rather than read, so the decision is pure and testable.
 */
export function defaultDateForPeriod(
  year: number,
  month: number,
  selectedDate: string | null,
  today: string
): string {
  if (selectedDate) return selectedDate;
  const [todayYear, todayMonth] = today.split('-').map(Number);
  if (todayYear === year && todayMonth === month + 1) return today;
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Weekly occurrences of `startIso`'s weekday from `startIso` through `untilIso` (inclusive).
 * Stops early past `maxCount` occurrences so a bad end date can't generate an unbounded list —
 * callers should treat `length > maxCount` as "too many, ask the user to narrow the range".
 */
export function weeklyOccurrences(startIso: string, untilIso: string, maxCount: number): string[] {
  const dates: string[] = [];
  let cur = startIso;
  while (cur <= untilIso && dates.length <= maxCount) {
    dates.push(cur);
    cur = addDaysIso(cur, 7);
  }
  return dates;
}
