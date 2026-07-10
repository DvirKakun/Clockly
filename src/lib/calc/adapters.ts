import type { ShiftWithBreaks } from '@/hooks/useShifts';
import type { Workplace } from '@/hooks/useWorkplaces';
import type { TaxProfileRow } from '@/hooks/useTaxProfile';
import type { DayType, RateProfile, ShiftInput, TaxProfile } from './types';

export function workplaceToRateProfile(workplace: Workplace): RateProfile {
  return {
    employmentType: workplace.employment_type as RateProfile['employmentType'],
    hourlyRate: workplace.hourly_rate ?? undefined,
    dailyRate: workplace.daily_rate ?? undefined,
    monthlySalary: workplace.monthly_salary ?? undefined,
    standardWeeklyHours: workplace.standard_weekly_hours,
    workDaysPerWeek: workplace.work_days_per_week as 5 | 6,
  };
}

export function shiftRowToInput(shift: ShiftWithBreaks): ShiftInput | null {
  if (!shift.end_time) return null; // open (still clocked in) shift — excluded from calculations
  return {
    id: shift.id,
    date: shift.date,
    startTime: shift.start_time.slice(0, 5),
    endTime: shift.end_time.slice(0, 5),
    crossesMidnight: shift.crosses_midnight,
    dayType: shift.day_type as DayType,
    breaks: shift.breaks.map((b) => ({
      startTime: b.start_time.slice(0, 5),
      endTime: b.end_time.slice(0, 5),
      isPaid: b.is_paid,
    })),
    bonuses: shift.bonuses,
    tips: shift.tips,
    travelReimbursement: shift.travel_reimbursement,
    mealDeduction: shift.meal_deduction,
    otherDeduction: shift.other_deduction,
  };
}

export function taxProfileRowToTaxProfile(row: TaxProfileRow): TaxProfile {
  return {
    isResident: row.is_resident,
    isFemale: row.is_female,
    additionalCreditPoints: row.additional_credit_points,
    pensionOptIn: row.pension_opt_in,
    kerenHishtalmutOptIn: row.keren_hishtalmut_opt_in,
    carValueAddition: row.car_value_addition,
  };
}
