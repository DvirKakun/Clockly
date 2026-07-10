import type {
  BreakInput,
  MonthlyGrossResult,
  RateProfile,
  ShiftGrossResult,
  ShiftHoursBreakdown,
  ShiftInput,
} from './types';
import type { LegalRatesConfig } from './rates';
import { DEFAULT_RATES } from './rates';
import { shabbatOverlapOffsetMinutes } from './shabbatHoliday';

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** A break's [start, end) as minute offsets from the shift's own start (0 = shift start). */
function breakRangeMinutes(brk: BreakInput, crossesMidnight: boolean, shiftStartMin: number): { start: number; end: number } {
  let start = toMinutes(brk.startTime);
  let end = toMinutes(brk.endTime);
  if (end <= start) end += 24 * 60;
  if (crossesMidnight && start < shiftStartMin) {
    start += 24 * 60;
    end += 24 * 60;
  }
  return { start: start - shiftStartMin, end: end - shiftStartMin };
}

function breakDurationMinutes(brk: BreakInput, crossesMidnight: boolean, shiftStartMin: number): number {
  const { start, end } = breakRangeMinutes(brk, crossesMidnight, shiftStartMin);
  return Math.max(0, end - start);
}

/** How many minutes of a break fall within [zoneStart, zoneEnd) (shift-relative offsets). */
function breakOverlapMinutes(
  brk: BreakInput,
  crossesMidnight: boolean,
  shiftStartMin: number,
  zoneStart: number,
  zoneEnd: number
): number {
  const { start, end } = breakRangeMinutes(brk, crossesMidnight, shiftStartMin);
  const overlapStart = Math.max(start, zoneStart);
  const overlapEnd = Math.min(end, zoneEnd);
  return Math.max(0, overlapEnd - overlapStart);
}

/** Overlap in minutes between the shift's absolute time range and the nightly 22:00-06:00 window. */
function nightOverlapMinutes(
  shiftStartMin: number,
  shiftEndMin: number,
  nightStart: string,
  nightEnd: string
): number {
  const nStart = toMinutes(nightStart);
  const nEnd = toMinutes(nightEnd) + 24 * 60; // 06:00 next day
  let overlap = 0;
  // Check the night window anchored to day 0 and day 1 (shift can span up to ~2 days)
  for (const offset of [0, 24 * 60]) {
    const winStart = nStart + offset;
    const winEnd = nEnd + offset;
    const start = Math.max(shiftStartMin, winStart);
    const end = Math.min(shiftEndMin, winEnd);
    if (end > start) overlap += end - start;
  }
  return overlap;
}

export function computeShiftHours(
  shift: ShiftInput,
  rateProfile: RateProfile,
  rates: LegalRatesConfig = DEFAULT_RATES
): ShiftHoursBreakdown {
  const startMin = toMinutes(shift.startTime);
  let endMin = toMinutes(shift.endTime);
  if (shift.crossesMidnight || endMin <= startMin) endMin += 24 * 60;

  const totalMinutes = endMin - startMin;

  let paidBreakMin = 0;
  let unpaidBreakMin = 0;
  for (const brk of shift.breaks) {
    const dur = breakDurationMinutes(brk, shift.crossesMidnight, startMin);
    if (brk.isPaid) paidBreakMin += dur;
    else unpaidBreakMin += dur;
  }

  const payableMinutes = Math.max(0, totalMinutes - unpaidBreakMin);
  const payableHours = payableMinutes / 60;

  const nightMin = nightOverlapMinutes(
    startMin,
    endMin,
    rates.standardHours.nightWindowStart,
    rates.standardHours.nightWindowEnd
  );
  const isNightShift = nightMin / 60 >= rates.standardHours.nightWindowMinHoursToQualify;

  const standardDailyHours = isNightShift
    ? rates.standardHours.nightShiftDailyHours
    : rateProfile.workDaysPerWeek === 6
      ? rates.standardHours.dailyHoursSixDayWeek
      : rates.standardHours.dailyHoursFiveDayWeek;

  let regularHours = 0;
  let overtime125Hours = 0;
  let overtime150Hours = 0;
  let shabbatBaseHours = 0;
  let shabbatOvertime175Hours = 0;
  let shabbatOvertime200Hours = 0;

  // An explicit 'shabbat'/'holiday' choice always treats the whole shift as one zone
  // (the user's override). For 'regular', check whether the shift's own date/time actually
  // crosses the Shabbat boundary — a shift starting before Friday's entry and ending after it
  // (or the reverse, starting inside Shabbat and ending after it exits) gets split into a
  // regular segment and a Shabbat segment, each paid at its own rate, instead of forcing the
  // whole shift into a single bucket.
  const shabbatOverlap =
    shift.dayType === 'regular'
      ? shabbatOverlapOffsetMinutes(shift.date, shift.startTime, shift.endTime, shift.crossesMidnight, rates)
      : null;
  const isSplitShift = shabbatOverlap != null && !(shabbatOverlap.startOffsetMin <= 0 && shabbatOverlap.endOffsetMin >= totalMinutes);

  if (shift.dayType === 'shabbat' || shift.dayType === 'holiday' || (shabbatOverlap && !isSplitShift)) {
    shabbatBaseHours = Math.min(payableHours, standardDailyHours);
    const remaining = Math.max(0, payableHours - shabbatBaseHours);
    shabbatOvertime175Hours = Math.min(remaining, rates.shabbatHoliday.overtimeFirstTierHours);
    shabbatOvertime200Hours = Math.max(0, remaining - shabbatOvertime175Hours);
  } else if (isSplitShift && shabbatOverlap) {
    // Chronological zones: at most one boundary crossing in the common case (pre-Shabbat then
    // Shabbat, or Shabbat then post-Shabbat); a third zone only appears for an unrealistically
    // long (~25h+) shift that spans both the entry and exit boundary.
    const zones: { start: number; end: number; isShabbat: boolean }[] = [];
    if (shabbatOverlap.startOffsetMin > 0) zones.push({ start: 0, end: shabbatOverlap.startOffsetMin, isShabbat: false });
    zones.push({ start: shabbatOverlap.startOffsetMin, end: shabbatOverlap.endOffsetMin, isShabbat: true });
    if (shabbatOverlap.endOffsetMin < totalMinutes) {
      zones.push({ start: shabbatOverlap.endOffsetMin, end: totalMinutes, isShabbat: false });
    }

    // The standard-daily-hours budget is one shared pool for the whole shift, consumed
    // chronologically — it's a single day's threshold for when overtime starts, regardless of
    // which rate zone the hours fall in. Each zone's overtime tier-1 allowance is independent,
    // since regular and Shabbat overtime are legally distinct categories.
    let budgetMin = standardDailyHours * 60;
    for (const zone of zones) {
      let zoneUnpaidBreakMin = 0;
      for (const brk of shift.breaks) {
        if (brk.isPaid) continue;
        zoneUnpaidBreakMin += breakOverlapMinutes(brk, shift.crossesMidnight, startMin, zone.start, zone.end);
      }
      const zonePayableHours = Math.max(0, zone.end - zone.start - zoneUnpaidBreakMin) / 60;

      const baseHoursThisZone = Math.min(zonePayableHours, budgetMin / 60);
      budgetMin = Math.max(0, budgetMin - baseHoursThisZone * 60);
      const remainingThisZone = Math.max(0, zonePayableHours - baseHoursThisZone);

      if (zone.isShabbat) {
        shabbatBaseHours += baseHoursThisZone;
        const tier1 = Math.min(remainingThisZone, rates.shabbatHoliday.overtimeFirstTierHours);
        shabbatOvertime175Hours += tier1;
        shabbatOvertime200Hours += Math.max(0, remainingThisZone - tier1);
      } else {
        regularHours += baseHoursThisZone;
        const tier1 = Math.min(remainingThisZone, rates.overtime.firstTierHours);
        overtime125Hours += tier1;
        overtime150Hours += Math.max(0, remainingThisZone - tier1);
      }
    }
  } else {
    regularHours = Math.min(payableHours, standardDailyHours);
    const remaining = Math.max(0, payableHours - regularHours);
    overtime125Hours = Math.min(remaining, rates.overtime.firstTierHours);
    overtime150Hours = Math.max(0, remaining - overtime125Hours);
  }

  return {
    totalHours: totalMinutes / 60,
    paidBreakHours: paidBreakMin / 60,
    unpaidBreakHours: unpaidBreakMin / 60,
    payableHours,
    isNightShift,
    standardDailyHours,
    regularHours,
    overtime125Hours,
    overtime150Hours,
    shabbatBaseHours,
    shabbatOvertime175Hours,
    shabbatOvertime200Hours,
  };
}

function deriveHourlyRate(rateProfile: RateProfile, rates: LegalRatesConfig): number {
  switch (rateProfile.employmentType) {
    case 'hourly':
      return rateProfile.hourlyRate ?? 0;
    case 'daily': {
      const standardDaily =
        rateProfile.workDaysPerWeek === 6
          ? rates.standardHours.dailyHoursSixDayWeek
          : rates.standardHours.dailyHoursFiveDayWeek;
      return (rateProfile.dailyRate ?? 0) / standardDaily;
    }
    case 'monthly':
      return (rateProfile.monthlySalary ?? 0) / rates.standardHours.monthlyDivisor;
  }
}

export function computeShiftGross(
  shift: ShiftInput,
  rateProfile: RateProfile,
  rates: LegalRatesConfig = DEFAULT_RATES
): ShiftGrossResult {
  const hours = computeShiftHours(shift, rateProfile, rates);
  const hourlyRateUsed = deriveHourlyRate(rateProfile, rates);

  const regularPay = hours.regularHours * hourlyRateUsed;
  const overtime125Pay = hours.overtime125Hours * hourlyRateUsed * rates.overtime.firstTierRate;
  const overtime150Pay = hours.overtime150Hours * hourlyRateUsed * rates.overtime.secondTierRate;
  const shabbatBasePay = hours.shabbatBaseHours * hourlyRateUsed * rates.shabbatHoliday.baseRate;
  const shabbatOvertime175Pay =
    hours.shabbatOvertime175Hours * hourlyRateUsed * rates.shabbatHoliday.overtimeFirstTierRate;
  const shabbatOvertime200Pay =
    hours.shabbatOvertime200Hours * hourlyRateUsed * rates.shabbatHoliday.overtimeSecondTierRate;

  const bonuses = shift.bonuses ?? 0;
  const tips = shift.tips ?? 0;
  const travelReimbursement = Math.min(shift.travelReimbursement ?? 0, rates.travel.dailyCap);
  const mealDeduction = shift.mealDeduction ?? 0;
  const otherDeduction = shift.otherDeduction ?? 0;

  const totalGross =
    regularPay +
    overtime125Pay +
    overtime150Pay +
    shabbatBasePay +
    shabbatOvertime175Pay +
    shabbatOvertime200Pay +
    bonuses +
    tips +
    travelReimbursement -
    mealDeduction -
    otherDeduction;

  return {
    shiftId: shift.id,
    hours,
    hourlyRateUsed,
    regularPay,
    overtime125Pay,
    overtime150Pay,
    shabbatBasePay,
    shabbatOvertime175Pay,
    shabbatOvertime200Pay,
    bonuses,
    tips,
    travelReimbursement,
    mealDeduction,
    otherDeduction,
    totalGross,
  };
}

/**
 * Monthly aggregation. For monthly-salary employees the fixed salary already covers
 * "regular" hours; only overtime/shabbat premiums and additions/deductions are added
 * on top, mirroring standard Israeli payroll treatment of a global monthly salary.
 */
export function computeMonthlyGross(
  shifts: ShiftInput[],
  rateProfile: RateProfile,
  taxProfile: { carValueAddition: number },
  rates: LegalRatesConfig = DEFAULT_RATES
): MonthlyGrossResult {
  const shiftResults = shifts.map((s) => computeShiftGross(s, rateProfile, rates));

  const totalHours = shiftResults.reduce((sum, r) => sum + r.hours.payableHours, 0);
  const regularPaySum = shiftResults.reduce((sum, r) => sum + r.regularPay, 0);
  const overtimePay = shiftResults.reduce((sum, r) => sum + r.overtime125Pay + r.overtime150Pay, 0);
  const shabbatPay = shiftResults.reduce(
    (sum, r) => sum + r.shabbatBasePay + r.shabbatOvertime175Pay + r.shabbatOvertime200Pay,
    0
  );
  const bonuses = shiftResults.reduce((sum, r) => sum + r.bonuses, 0);
  const tips = shiftResults.reduce((sum, r) => sum + r.tips, 0);
  const travelReimbursement = shiftResults.reduce((sum, r) => sum + r.travelReimbursement, 0);
  const mealDeductions = shiftResults.reduce((sum, r) => sum + r.mealDeduction, 0);
  const otherDeductions = shiftResults.reduce((sum, r) => sum + r.otherDeduction, 0);
  const carValueAddition = taxProfile.carValueAddition ?? 0;

  const monthlyBase = rateProfile.employmentType === 'monthly' ? (rateProfile.monthlySalary ?? 0) : 0;
  const regularPay = rateProfile.employmentType === 'monthly' ? 0 : regularPaySum;

  const totalGross =
    monthlyBase +
    regularPay +
    overtimePay +
    shabbatPay +
    bonuses +
    tips +
    travelReimbursement +
    carValueAddition -
    mealDeductions -
    otherDeductions;

  const taxableGross = totalGross - travelReimbursement;

  return {
    shiftResults,
    totalHours,
    monthlyBase,
    regularPay,
    overtimePay,
    shabbatPay,
    bonuses,
    tips,
    travelReimbursement,
    mealDeductions,
    otherDeductions,
    carValueAddition,
    totalGross,
    taxableGross,
  };
}
