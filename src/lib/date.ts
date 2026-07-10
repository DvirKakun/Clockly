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

export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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
