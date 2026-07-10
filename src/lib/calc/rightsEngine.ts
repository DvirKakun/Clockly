import type { LegalRatesConfig } from './rates';
import { DEFAULT_RATES } from './rates';

function findSeniorityBand<T extends { minYears: number; maxYears: number | null }>(
  bands: T[],
  seniorityYears: number
): T | undefined {
  return bands.find((b) => seniorityYears >= b.minYears && (b.maxYears === null || seniorityYears <= b.maxYears));
}

export function annualLeaveDays(seniorityYears: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  const band = findSeniorityBand(rates.annualLeave.fiveDayWeekDaysBySeniority, Math.max(1, seniorityYears));
  return band ? Math.min(band.days, rates.annualLeave.maxDays) : rates.annualLeave.maxDays;
}

export function monthlyLeaveAccrual(seniorityYears: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  return annualLeaveDays(seniorityYears, rates) / 12;
}

export function sickLeaveAccrual(monthsWorked: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  const accrued = monthsWorked * rates.sickLeave.accrualDaysPerMonth;
  return Math.min(accrued, rates.sickLeave.maxAccumulation);
}

export function sickPayForDay(dayNumber: number, dailyWage: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  const rule = rates.sickLeave.paymentByDay.find((r) =>
    r.dayFrom !== undefined ? dayNumber >= r.dayFrom : r.day === dayNumber
  );
  const percent = rule?.percent ?? 100;
  return dailyWage * (percent / 100);
}

export function totalSickPay(sickDaysTaken: number, dailyWage: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  let total = 0;
  for (let day = 1; day <= sickDaysTaken; day++) {
    total += sickPayForDay(day, dailyWage, rates);
  }
  return total;
}

export function recoveryPayDays(seniorityYears: number, rates: LegalRatesConfig = DEFAULT_RATES): number {
  const band = findSeniorityBand(rates.recoveryPay.daysBySeniority, Math.max(0, seniorityYears));
  return band?.days ?? rates.recoveryPay.daysBySeniority[0].days;
}

export function recoveryPayAmount(
  seniorityYears: number,
  employmentFraction: number,
  rates: LegalRatesConfig = DEFAULT_RATES
): number {
  const days = recoveryPayDays(seniorityYears, rates);
  return days * rates.recoveryPay.dailyRate * Math.min(1, Math.max(0, employmentFraction));
}

export function isEligibleForHolidayPay(seniorityMonths: number, rates: LegalRatesConfig = DEFAULT_RATES): boolean {
  return seniorityMonths >= rates.holidayPay.minSeniorityMonths;
}
