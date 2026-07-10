import { computeMonthlyGross } from './grossEngine';
import { computeNetPay } from './netEngine';
import { shiftRowToInput, taxProfileRowToTaxProfile, workplaceToRateProfile } from './adapters';
import type { ShiftWithBreaks } from '@/hooks/useShifts';
import type { Workplace } from '@/hooks/useWorkplaces';
import type { TaxProfileRow } from '@/hooks/useTaxProfile';
import type { MonthlyGrossResult, NetResult } from './types';

export interface WorkplaceMonthSummary {
  workplace: Workplace;
  gross: MonthlyGrossResult;
}

export interface MonthSummary {
  byWorkplace: WorkplaceMonthSummary[];
  totalTaxableGross: number;
  totalGross: number;
  totalTravelReimbursement: number;
  net: NetResult;
  takeHomePay: number;
}

export function computeMonthSummary(
  workplaces: Workplace[],
  shifts: ShiftWithBreaks[],
  taxProfileRow: TaxProfileRow
): MonthSummary {
  const taxProfile = taxProfileRowToTaxProfile(taxProfileRow);

  const byWorkplace: WorkplaceMonthSummary[] = workplaces.map((workplace) => {
    const workplaceShifts = shifts
      .filter((s) => s.workplace_id === workplace.id)
      .map(shiftRowToInput)
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const gross = computeMonthlyGross(workplaceShifts, workplaceToRateProfile(workplace), {
      carValueAddition: 0,
    });

    return { workplace, gross };
  });

  const totalTaxableGross = byWorkplace.reduce((sum, w) => sum + w.gross.taxableGross, 0) + taxProfile.carValueAddition;
  const totalGross = byWorkplace.reduce((sum, w) => sum + w.gross.totalGross, 0) + taxProfile.carValueAddition;
  const totalTravelReimbursement = byWorkplace.reduce((sum, w) => sum + w.gross.travelReimbursement, 0);

  const net = computeNetPay(totalTaxableGross, taxProfile);
  const takeHomePay = net.netPay + totalTravelReimbursement;

  return { byWorkplace, totalTaxableGross, totalGross, totalTravelReimbursement, net, takeHomePay };
}
