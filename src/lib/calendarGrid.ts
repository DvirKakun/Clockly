export interface CalendarDay {
  iso: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * A Sunday-first month grid padded with leading/trailing days from the adjacent months so the
 * result is always a clean multiple of 7 (matching the Israeli week convention used elsewhere
 * in the app — see weekdayNames in ShiftsPage/DashboardPage).
 */
export function getMonthGridDays(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDow = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: CalendarDay[] = [];

  for (let i = startDow; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    cells.push({ iso: toIso(d), dayOfMonth: d.getDate(), isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ iso: toIso(d), dayOfMonth: day, isCurrentMonth: true });
  }

  let trailing = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, month + 1, trailing);
    cells.push({ iso: toIso(d), dayOfMonth: d.getDate(), isCurrentMonth: false });
    trailing++;
  }

  return cells;
}
