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

/** Whether the shift falls entirely inside the Shabbat window — safe to auto-mark as a Shabbat shift. */
export function isShiftFullyInShabbat(
  dateIso: string,
  startHHMM: string,
  endHHMM: string,
  crossesMidnight: boolean,
  rates: LegalRatesConfig = DEFAULT_RATES
): boolean {
  const window = shabbatWindowForDate(dateIso, rates);
  if (!window) return false;
  const shift = shiftRangeUtc(dateIso, startHHMM, endHHMM, crossesMidnight, rates.shabbatHoliday.location.timeZone);
  return shift.start >= window.start && shift.end <= window.end;
}

/** Whether the shift overlaps the Shabbat window at all, without being fully inside it — needs a manual look/split. */
export function shiftPartiallyOverlapsShabbat(
  dateIso: string,
  startHHMM: string,
  endHHMM: string,
  crossesMidnight: boolean,
  rates: LegalRatesConfig = DEFAULT_RATES
): boolean {
  const window = shabbatWindowForDate(dateIso, rates);
  if (!window) return false;
  const shift = shiftRangeUtc(dateIso, startHHMM, endHHMM, crossesMidnight, rates.shabbatHoliday.location.timeZone);
  const overlaps = shift.start < window.end && shift.end > window.start;
  const fullyInside = shift.start >= window.start && shift.end <= window.end;
  return overlaps && !fullyInside;
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
