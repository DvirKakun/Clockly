import { describe, expect, it } from 'vitest';
import {
  isShiftFullyInShabbat,
  isStatutoryHolidayDate,
  shabbatWindowForDate,
  shiftPartiallyOverlapsShabbat,
  zonedLocalToUtc,
} from '../shabbatHoliday';

describe('zonedLocalToUtc (DST correctness)', () => {
  it('applies the +2 standard-time offset in deep winter', () => {
    const utc = zonedLocalToUtc('2026-01-15', '12:00', 'Asia/Jerusalem');
    expect(utc.toISOString()).toBe('2026-01-15T10:00:00.000Z');
  });

  it('applies the +3 daylight-saving offset in deep summer', () => {
    const utc = zonedLocalToUtc('2026-07-15', '12:00', 'Asia/Jerusalem');
    expect(utc.toISOString()).toBe('2026-07-15T09:00:00.000Z');
  });
});

describe('shabbatWindowForDate', () => {
  it('returns null for a weekday', () => {
    expect(shabbatWindowForDate('2026-07-08')).toBeNull(); // Wednesday
  });

  it('returns a window for a Friday and for the following Saturday', () => {
    // 2026-07-10 is a Friday (verified via UTC day-of-week below).
    expect(new Date('2026-07-10T12:00:00Z').getUTCDay()).toBe(5);
    const friday = shabbatWindowForDate('2026-07-10');
    const saturday = shabbatWindowForDate('2026-07-11');
    expect(friday).not.toBeNull();
    expect(saturday).not.toBeNull();
    // Both dates belong to the same weekly window.
    expect(friday!.start.getTime()).toBe(saturday!.start.getTime());
    expect(friday!.end.getTime()).toBe(saturday!.end.getTime());
    expect(friday!.start.getTime()).toBeLessThan(friday!.end.getTime());
  });

  it('start boundary sits within a sane range around sunset-1hr for any season', () => {
    const winter = shabbatWindowForDate('2026-01-16'); // a Friday near winter solstice-ish
    const summer = shabbatWindowForDate('2026-06-19'); // a Friday near summer solstice-ish
    expect(winter).not.toBeNull();
    expect(summer).not.toBeNull();
    // Israel sunset never falls outside roughly 16:00-20:00 local, so sunset-1hr never
    // falls outside roughly 15:00-19:00 local — sanity bound, not an exact-minute assertion.
    const winterStartLocalHour = new Date(winter!.start).getUTCHours() + 2; // UTC+2 in Jan
    const summerStartLocalHour = new Date(summer!.start).getUTCHours() + 3; // UTC+3 in Jun
    expect(winterStartLocalHour).toBeGreaterThanOrEqual(14);
    expect(winterStartLocalHour).toBeLessThanOrEqual(19);
    expect(summerStartLocalHour).toBeGreaterThanOrEqual(14);
    expect(summerStartLocalHour).toBeLessThanOrEqual(19);
  });
});

describe('isShiftFullyInShabbat / shiftPartiallyOverlapsShabbat', () => {
  it('a Friday afternoon shift well before sunset is not Shabbat', () => {
    expect(isShiftFullyInShabbat('2026-07-10', '10:00', '13:00', false)).toBe(false);
    expect(shiftPartiallyOverlapsShabbat('2026-07-10', '10:00', '13:00', false)).toBe(false);
  });

  it('a late Friday-night shift is fully inside Shabbat in any season', () => {
    // Latest possible sunset-1hr is well before 22:00 year-round.
    expect(isShiftFullyInShabbat('2026-07-10', '22:00', '23:30', false)).toBe(true);
    expect(isShiftFullyInShabbat('2026-01-16', '22:00', '23:30', false)).toBe(true);
  });

  it('a Saturday morning shift is fully inside Shabbat', () => {
    expect(isShiftFullyInShabbat('2026-07-11', '08:00', '12:00', false)).toBe(true);
  });

  it('a Saturday shift starting well after nightfall in any season is not Shabbat', () => {
    // Earliest possible Saturday-end (sunset+20) is well before 21:00 year-round.
    expect(isShiftFullyInShabbat('2026-01-17', '21:00', '23:00', false)).toBe(false);
    expect(isShiftFullyInShabbat('2026-07-11', '21:00', '23:00', false)).toBe(false);
  });

  it('a Friday shift straddling the entry boundary is a partial overlap, not fully-in', () => {
    // Starts mid-afternoon (safely before the earliest possible start boundary) and ends
    // at night (safely after the latest possible start boundary).
    expect(shiftPartiallyOverlapsShabbat('2026-01-16', '13:00', '20:00', false)).toBe(true);
    expect(isShiftFullyInShabbat('2026-01-16', '13:00', '20:00', false)).toBe(false);
  });

  it('a weekday shift never overlaps Shabbat', () => {
    expect(isShiftFullyInShabbat('2026-07-08', '09:00', '17:00', false)).toBe(false);
    expect(shiftPartiallyOverlapsShabbat('2026-07-08', '09:00', '17:00', false)).toBe(false);
  });
});

describe('isStatutoryHolidayDate', () => {
  it('flags Rosh Hashana I and II 2026 (1-2 Tishrei 5787 = September 12-13, 2026)', () => {
    expect(isStatutoryHolidayDate('2026-09-12')).toBe(true);
    expect(isStatutoryHolidayDate('2026-09-13')).toBe(true);
  });

  it('does not flag Erev Rosh Hashana (29 Elul, the day before)', () => {
    expect(isStatutoryHolidayDate('2026-09-11')).toBe(false);
  });

  it('flags Pesach I 2026 (verified: 15 Nisan 5786 = Thursday, April 2, 2026)', () => {
    expect(isStatutoryHolidayDate('2026-04-02')).toBe(true);
  });

  it('does not flag Erev Pesach (14 Nisan) itself', () => {
    expect(isStatutoryHolidayDate('2026-04-01')).toBe(false);
  });

  it('does not flag Chol HaMoed Pesach (an intermediate day)', () => {
    expect(isStatutoryHolidayDate('2026-04-05')).toBe(false);
  });

  it('flags the 7th day of Pesach 2026 (21 Nisan 5786 = April 8, 2026)', () => {
    expect(isStatutoryHolidayDate('2026-04-08')).toBe(true);
  });

  it('does not flag an ordinary weekday', () => {
    expect(isStatutoryHolidayDate('2026-07-08')).toBe(false);
  });
});
