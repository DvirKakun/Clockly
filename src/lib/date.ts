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
