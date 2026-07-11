import ExcelJS from 'exceljs';
import type { MonthSummary } from '@/lib/calc/monthSummary';
import type { ShiftWithBreaks } from '@/hooks/useShifts';
import type { ShiftGrossResult } from '@/lib/calc/types';
import { DAY_TYPE_LABELS_HE } from '@/lib/labels';

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F62ED' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true };
const CURRENCY_FORMAT = '#,##0 "₪"';

function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31);
  return cleaned || 'מקום עבודה';
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: 'right' };
  });
}

export async function buildMonthlyReportWorkbook(
  summary: MonthSummary,
  shifts: ShiftWithBreaks[],
  monthLabel: string
): Promise<ExcelJS.Workbook> {
  const shiftById = new Map(shifts.map((s) => [s.id, s]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Clockly';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('סיכום', { views: [{ rightToLeft: true }] });
  summarySheet.columns = [
    { header: 'פריט', key: 'label', width: 28 },
    { header: 'סכום', key: 'value', width: 18, style: { numFmt: CURRENCY_FORMAT } },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRow({ label: `דוח משכורת — ${monthLabel}`, value: null });
  summarySheet.mergeCells('A2:B2');
  summarySheet.getCell('A2').font = { bold: true, size: 13 };
  summarySheet.addRow({ label: 'סה"כ ברוטו', value: summary.totalGross });
  summarySheet.addRow({ label: 'מס הכנסה', value: -summary.net.incomeTax });
  summarySheet.addRow({ label: 'ביטוח לאומי', value: -summary.net.nationalInsurance });
  summarySheet.addRow({ label: 'דמי בריאות', value: -summary.net.healthTax });
  if (summary.net.pensionEmployee > 0) summarySheet.addRow({ label: 'פנסיה', value: -summary.net.pensionEmployee });
  if (summary.net.kerenHishtalmutEmployee > 0) {
    summarySheet.addRow({ label: 'קרן השתלמות', value: -summary.net.kerenHishtalmutEmployee });
  }
  summarySheet.addRow({ label: 'נטו (לפני נסיעות)', value: summary.net.netPay });
  summarySheet.addRow({ label: 'החזר נסיעות', value: summary.totalTravelReimbursement });
  const takeHomeRow = summarySheet.addRow({ label: 'סה"כ לתשלום', value: summary.takeHomePay });
  takeHomeRow.font = { bold: true };

  for (const { workplace, gross } of summary.byWorkplace) {
    const sheet = workbook.addWorksheet(sanitizeSheetName(workplace.name), { views: [{ rightToLeft: true }] });
    sheet.columns = [
      { header: 'תאריך', key: 'date', width: 12 },
      { header: 'סוג יום', key: 'dayType', width: 10 },
      { header: 'שעות', key: 'hours', width: 9 },
      { header: 'רגיל', key: 'regularPay', width: 12, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'נוספות', key: 'overtimePay', width: 12, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'שבת/חג', key: 'shabbatPay', width: 12, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'בונוס', key: 'bonuses', width: 10, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'טיפים', key: 'tips', width: 10, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'נסיעות', key: 'travel', width: 10, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'ניכוי ארוחות', key: 'meal', width: 12, style: { numFmt: CURRENCY_FORMAT } },
      { header: 'סה"כ', key: 'total', width: 12, style: { numFmt: CURRENCY_FORMAT } },
    ];
    styleHeaderRow(sheet.getRow(1));

    const rows: (ShiftGrossResult & { date: string })[] = gross.shiftResults
      .map((shift) => ({ ...shift, date: shiftById.get(shift.shiftId)?.date ?? '' }))
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const shift of rows) {
      const dayType = shiftById.get(shift.shiftId)?.day_type as keyof typeof DAY_TYPE_LABELS_HE | undefined;
      sheet.addRow({
        date: shift.date,
        dayType: dayType ? DAY_TYPE_LABELS_HE[dayType] : '',
        hours: Number(shift.hours.payableHours.toFixed(2)),
        regularPay: shift.regularPay,
        overtimePay: shift.overtime125Pay + shift.overtime150Pay,
        shabbatPay: shift.shabbatBasePay + shift.shabbatOvertime175Pay + shift.shabbatOvertime200Pay,
        bonuses: shift.bonuses,
        tips: shift.tips,
        travel: shift.travelReimbursement,
        meal: -shift.mealDeduction,
        total: shift.totalGross,
      });
    }

    const totalRow = sheet.addRow({
      date: 'סה"כ',
      hours: Number(gross.totalHours.toFixed(2)),
      regularPay: gross.regularPay,
      overtimePay: gross.overtimePay,
      shabbatPay: gross.shabbatPay,
      bonuses: gross.bonuses,
      tips: gross.tips,
      travel: gross.travelReimbursement,
      meal: -gross.mealDeductions,
      total: gross.totalGross,
    });
    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
      cell.border = { top: { style: 'thin' } };
    });
  }

  return workbook;
}

export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
