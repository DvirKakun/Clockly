export type EmploymentType = 'hourly' | 'daily' | 'monthly';
export type DayType = 'regular' | 'shabbat' | 'holiday';

export interface RateProfile {
  employmentType: EmploymentType;
  hourlyRate?: number;
  dailyRate?: number;
  monthlySalary?: number;
  standardWeeklyHours: number;
  workDaysPerWeek: 5 | 6;
}

export interface BreakInput {
  startTime: string;
  endTime: string;
  isPaid: boolean;
}

export interface ShiftInput {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  dayType: DayType;
  breaks: BreakInput[];
  bonuses?: number;
  tips?: number;
  travelReimbursement?: number;
  mealDeduction?: number;
  otherDeduction?: number;
}

export interface ShiftHoursBreakdown {
  totalHours: number;
  paidBreakHours: number;
  unpaidBreakHours: number;
  payableHours: number;
  isNightShift: boolean;
  standardDailyHours: number;
  regularHours: number;
  overtime125Hours: number;
  overtime150Hours: number;
  shabbatBaseHours: number;
  shabbatOvertime175Hours: number;
  shabbatOvertime200Hours: number;
}

export interface ShiftGrossResult {
  shiftId: string;
  hours: ShiftHoursBreakdown;
  hourlyRateUsed: number;
  regularPay: number;
  overtime125Pay: number;
  overtime150Pay: number;
  shabbatBasePay: number;
  shabbatOvertime175Pay: number;
  shabbatOvertime200Pay: number;
  bonuses: number;
  tips: number;
  travelReimbursement: number;
  mealDeduction: number;
  otherDeduction: number;
  totalGross: number;
}

export interface MonthlyGrossResult {
  shiftResults: ShiftGrossResult[];
  totalHours: number;
  monthlyBase: number;
  regularPay: number;
  overtimePay: number;
  shabbatPay: number;
  bonuses: number;
  tips: number;
  travelReimbursement: number;
  mealDeductions: number;
  otherDeductions: number;
  carValueAddition: number;
  totalGross: number;
  taxableGross: number;
}

export interface TaxProfile {
  isResident: boolean;
  isFemale: boolean;
  additionalCreditPoints: number;
  pensionOptIn: boolean;
  kerenHishtalmutOptIn: boolean;
  carValueAddition: number;
}

export interface NetResult {
  taxableGross: number;
  creditPoints: number;
  creditPointsValue: number;
  incomeTaxBeforeCredits: number;
  incomeTax: number;
  socialSecurity: number;
  socialSecurityBreakdown: {
    belowThreshold: number;
    aboveThreshold: number;
  };
  pensionEmployee: number;
  kerenHishtalmutEmployee: number;
  totalDeductions: number;
  netPay: number;
}
