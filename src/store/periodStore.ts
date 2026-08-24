import { create } from 'zustand';
import { stepMonth } from '@/lib/date';

/**
 * The period the user is currently looking at, shared by the dashboard, the shifts screen and the
 * reports screen.
 *
 * Previously each screen held its own `useState` cursor initialised to *today's* month, so the app
 * threw the user's place away constantly: open a shift from March and come back and you landed on
 * the current month; save an edit and you landed on the current month; switch to Home and you
 * landed on the current month. For anyone reconciling a past month — the main reason to look
 * backwards at all — every action cost them their position.
 *
 * Deliberately NOT persisted: a month selection is a navigational position, not a preference, so
 * the app opens on the current month every launch. Deliberately NOT in the URL either — with push
 * semantics every arrow tap becomes a history entry and Back walks month-by-month instead of
 * leaving the screen; with replace semantics the URL stops matching history anyway, forfeiting the
 * only real advantage.
 */
interface PeriodState {
  year: number;
  /** 0-indexed, matching Date and the rest of the app's cursor convention. */
  month: number;
  /**
   * The day selected in the shifts calendar (yyyy-mm-dd), or null. Lives here with the month for
   * the same reason: returning from a shift should restore the day panel you opened it from, not
   * just the month.
   */
  selectedDate: string | null;
  setPeriod: (year: number, month: number) => void;
  /** Steps by whole months, rolling the year — what the MonthNavigator arrows call. */
  stepPeriod: (delta: number) => void;
  resetToCurrent: () => void;
  setSelectedDate: (date: string | null) => void;
}

function currentPeriod(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export const usePeriodStore = create<PeriodState>((set) => ({
  ...currentPeriod(),
  selectedDate: null,
  // Changing month clears the selected day: a date from the old month has no cell in the new
  // grid, and keeping it would leave the day panel describing a day that isn't on screen.
  setPeriod: (year, month) => set({ year, month, selectedDate: null }),
  stepPeriod: (delta) => set((state) => ({ ...stepMonth(state.year, state.month, delta), selectedDate: null })),
  resetToCurrent: () => set({ ...currentPeriod(), selectedDate: null }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
