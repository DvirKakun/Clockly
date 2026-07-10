import rates2026 from './rates_2026.json';

export interface TaxBracket {
  upTo: number | null;
  rate: number;
}

export interface LegalRatesConfig {
  year: number;
  effectiveFrom: string;
  currency: string;
  minimumWage: {
    hourly: number;
    monthly: number;
    youth: { age16to17: number; age17to18: number };
  };
  standardHours: {
    weeklyHours: number;
    dailyHoursFiveDayWeek: number;
    dailyHoursSixDayWeek: number;
    nightShiftDailyHours: number;
    nightWindowStart: string;
    nightWindowEnd: string;
    nightWindowMinHoursToQualify: number;
    monthlyDivisor: number;
  };
  overtime: { firstTierHours: number; firstTierRate: number; secondTierRate: number };
  shabbatHoliday: {
    baseRate: number;
    overtimeFirstTierHours: number;
    overtimeFirstTierRate: number;
    overtimeSecondTierRate: number;
    holidayCompensationMaxRate: number;
    /** Statutory: weekly rest begins at the workplace one hour before Friday sunset. */
    startBufferBeforeSunsetMinutes: number;
    /** Approximation of tzeit hakochavim (nightfall); not a single fixed legal offset. */
    endBufferAfterSunsetMinutes: number;
    location: { latitude: number; longitude: number; timeZone: string };
  };
  statutoryHolidays: { day: number; monthName: string; label: string }[];
  incomeTaxBracketsMonthly: TaxBracket[];
  surtax: { monthlyThreshold: number; annualThreshold: number; rate: number; note: string };
  taxCreditPoint: { monthlyValue: number; residentPoints: number; femalePoints: number };
  socialSecurity: {
    lowerThreshold: number;
    upperCeiling: number;
    employeeRateBelowThreshold: number;
    employeeRateAboveThreshold: number;
    breakdown: {
      belowThreshold: { nationalInsurance: number; healthTax: number };
      aboveThreshold: { nationalInsurance: number; healthTax: number };
    };
    employerRateBelowThreshold: number;
    employerRateAboveThreshold: number;
  };
  pension: {
    totalRate: number;
    employeeContributionRate: number;
    employerContributionRate: number;
    employerSeveranceRate: number;
    employerSeveranceRateMax: number;
    eligibilityAgeMale: number;
    eligibilityAgeFemale: number;
    monthlyCeiling: number;
  };
  kerenHishtalmut: { employeeRate: number; employerRate: number; monthlyCeiling: number };
  recoveryPay: {
    dailyRate: number;
    pendingDailyRate: number;
    daysBySeniority: { minYears: number; maxYears: number | null; days: number }[];
  };
  travel: { dailyCap: number; minDistanceMeters: number };
  annualLeave: {
    fiveDayWeekDaysBySeniority: { minYears: number; maxYears: number | null; days: number }[];
    maxDays: number;
    minWorkDaysForEligibility: number;
  };
  sickLeave: {
    accrualDaysPerMonth: number;
    maxAnnualAccrual: number;
    maxAccumulation: number;
    paymentByDay: { day?: number; dayFrom?: number; percent: number }[];
  };
  holidayPay: { minSeniorityMonths: number };
}

const RATES_BY_YEAR: Record<number, LegalRatesConfig> = {
  2026: rates2026 as LegalRatesConfig,
};

export function getRatesForYear(year: number): LegalRatesConfig {
  return RATES_BY_YEAR[year] ?? RATES_BY_YEAR[2026];
}

export function getRatesForDate(date: Date): LegalRatesConfig {
  return getRatesForYear(date.getFullYear());
}

export const DEFAULT_RATES = RATES_BY_YEAR[2026];
