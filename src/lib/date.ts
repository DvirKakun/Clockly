export const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
export const WEEKDAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const WEEKDAY_SHORT_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
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
