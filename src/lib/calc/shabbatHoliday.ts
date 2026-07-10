import * as SunCalc from 'suncalc';
import { toJewishDate } from 'jewish-date';
import type { LegalRatesConfig } from './rates';
import { DEFAULT_RATES } from './rates';

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  const hour = parts.hour === '24' ? '0' : parts.hour;
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +hour, +parts.minute, +parts.second);
  return (asUtc - date.getTime()) / 60_000;
}

/**
 * Converts a local wall-clock date+time in `timeZone` into the absolute UTC instant it
 * represents. Correctly absorbs a summer/winter clock change for any date, since the
 * offset is read from the actual IANA tz database via Intl rather than hardcoded.
 */
export function zonedLocalToUtc(dateIso: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = dateIso.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const naiveUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offsetMinutes = getTimeZoneOffsetMinutes(timeZone, new Date(naiveUtc));
  return new Date(naiveUtc - offsetMinutes * 60_000);
}

function addDaysIso(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function sunsetUtc(dateIso: string, rates: LegalRatesConfig): Date {
  const { latitude, longitude, timeZone } = rates.shabbatHoliday.location;
  // Anchored at local noon: SunCalc's math is purely UTC-instant-based (see its
  // toDays()), so any instant within the intended solar day is sufficient — noon just
  // avoids ever landing near a UTC midnight boundary.
  const anchor = zonedLocalToUtc(dateIso, '12:00', timeZone);
  const times = SunCalc.getTimes(anchor, latitude, longitude);
  return times.sunset as Date;
}

export interface DateWindow {
  start: Date;
  end: Date;
}

/**
 * The weekly Shabbat window covering `dateIso`, if `dateIso` is a Friday or Saturday.
 * Returns null for any other day of the week, since no ordinary shift (under ~24h) that
 * starts Sun-Thu can reach Friday's sunset-minus-buffer boundary.
 */
export function shabbatWindowForDate(dateIso: string, rates: LegalRatesConfig = DEFAULT_RATES): DateWindow | null {
  const dow = new Date(dateIso + 'T12:00:00Z').getUTCDay(); // 0=Sun..6=Sat
  let fridayIso: string;
  if (dow === 5) fridayIso = dateIso;
  else if (dow === 6) fridayIso = addDaysIso(dateIso, -1);
  else return null;

  const saturdayIso = addDaysIso(fridayIso, 1);
  const { startBufferBeforeSunsetMinutes, endBufferAfterSunsetMinutes } = rates.shabbatHoliday;
  const start = new Date(sunsetUtc(fridayIso, rates).getTime() - startBufferBeforeSunsetMinutes * 60_000);
  const end = new Date(sunsetUtc(saturdayIso, rates).getTime() + endBufferAfterSunsetMinutes * 60_000);
  return { start, end };
}

function shiftRangeUtc(
  dateIso: string,
  startHHMM: string,
  endHHMM: string,
  crossesMidnight: boolean,
  timeZone: string
): DateWindow {
  const start = zonedLocalToUtc(dateIso, startHHMM, timeZone);
  let end = zonedLocalToUtc(crossesMidnight ? addDaysIso(dateIso, 1) : dateIso, endHHMM, timeZone);
  if (end <= start) end = zonedLocalToUtc(addDaysIso(dateIso, 1), endHHMM, timeZone);
  return { start, end };
}

function shiftTotalMinutes(startHHMM: string, endHHMM: string, crossesMidnight: boolean): number {
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const start = toMin(startHHMM);
  let end = toMin(endHHMM);
  if (crossesMidnight || end <= start) end += 24 * 60;
  return end - start;
}

/**
 * The portion of the shift (if any) that overlaps the Shabbat window, expressed as minute
 * offsets from the shift's own start (0 = shift start) — the same coordinate system
 * grossEngine's minute-based math already uses, so the engine never has to do its own
 * date/timezone arithmetic. Returns null if there's no overlap at all.
 *
 * Note: like the rest of this shift model, this measures wall-clock minutes (standard
 * payroll convention — you're paid for clocked hours, not absolute elapsed time), derived
 * from real sunset/timezone instants for where the boundary falls. A shift whose minutes
 * happen to straddle the exact instant of Israel's spring/fall clock change could see the
 * zone split off by up to the DST delta; total payable hours are unaffected either way,
 * since those come from the shift's own wall-clock start/end, independent of this split.
 */
export function shabbatOverlapOffsetMinutes(
  dateIso: string,
  startHHMM: string,
  endHHMM: string,
  crossesMidnight: boolean,
  rates: LegalRatesConfig = DEFAULT_RATES
): { startOffsetMin: number; endOffsetMin: number } | null {
  const window = shabbatWindowForDate(dateIso, rates);
  if (!window) return null;
  const timeZone = rates.shabbatHoliday.location.timeZone;
  const shift = shiftRangeUtc(dateIso, startHHMM, endHHMM, crossesMidnight, timeZone);

  const overlapStartMs = Math.max(shift.start.getTime(), window.start.getTime());
  const overlapEndMs = Math.min(shift.end.getTime(), window.end.getTime());
  if (overlapEndMs <= overlapStartMs) return null;

  const totalMin = shiftTotalMinutes(startHHMM, endHHMM, crossesMidnight);
  const startOffsetMin = Math.round((overlapStartMs - shift.start.getTime()) / 60_000);
  const endOffsetMin = Math.round((overlapEndMs - shift.start.getTime()) / 60_000);
  return {
    startOffsetMin: Math.max(0, startOffsetMin),
    endOffsetMin: Math.min(totalMin, endOffsetMin),
  };
}

/** Whether the shift falls entirely inside the Shabbat window — safe to auto-mark as a Shabbat shift. */
export function isShiftFullyInShabbat(
  dateIso: string,
  startHHMM: string,
  endHHMM: string,
  crossesMidnight: boolean,
  rates: LegalRatesConfig = DEFAULT_RATES
): boolean {
  const overlap = shabbatOverlapOffsetMinutes(dateIso, startHHMM, endHHMM, crossesMidnight, rates);
  if (!overlap) return false;
  const totalMin = shiftTotalMinutes(startHHMM, endHHMM, crossesMidnight);
  return overlap.startOffsetMin <= 0 && overlap.endOffsetMin >= totalMin;
}

/** Whether the shift overlaps the Shabbat window at all, without being fully inside it. */
export function shiftPartiallyOverlapsShabbat(
  dateIso: string,
  startHHMM: string,
  endHHMM: string,
  crossesMidnight: boolean,
  rates: LegalRatesConfig = DEFAULT_RATES
): boolean {
  const overlap = shabbatOverlapOffsetMinutes(dateIso, startHHMM, endHHMM, crossesMidnight, rates);
  if (!overlap) return false;
  const totalMin = shiftTotalMinutes(startHHMM, endHHMM, crossesMidnight);
  const fullyInside = overlap.startOffsetMin <= 0 && overlap.endOffsetMin >= totalMin;
  return !fullyInside;
}

/**
 * Whether `dateIso` is an Israeli statutory holiday (Rosh Hashana, Yom Kippur, Sukkot I,
 * Shmini Atzeret/Simchat Torah, Pesach I/VII, Shavuot). Chol HaMoed (intermediate days)
 * is deliberately excluded — those aren't statutory holidays for pay purposes.
 *
 * Uses the runtime's local calendar getters (via the `jewish-date` package), so this is
 * correct for the overwhelmingly common case of an Israel-based device/browser; a device
 * with its system timezone manually set away from Israel could see an off-by-one-day result.
 */
export function statutoryHolidayName(dateIso: string, rates: LegalRatesConfig = DEFAULT_RATES): string | null {
  const [y, m, d] = dateIso.split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  const jewish = toJewishDate(localDate);
  const match = rates.statutoryHolidays.find((h) => h.day === jewish.day && h.monthName === jewish.monthName);
  return match?.label ?? null;
}

export function isStatutoryHolidayDate(dateIso: string, rates: LegalRatesConfig = DEFAULT_RATES): boolean {
  return statutoryHolidayName(dateIso, rates) !== null;
}
