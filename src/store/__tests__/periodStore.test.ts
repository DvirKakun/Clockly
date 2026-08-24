import { beforeEach, describe, expect, it } from 'vitest';
import { usePeriodStore } from '../periodStore';

/**
 * The store is the seam where "the selected month survives navigation" is true or false: every
 * screen reads from it, so if it holds the right value, remounting a screen lands on the right
 * month. These assertions cover the transitions the screens actually trigger.
 */

function read() {
  const { year, month, selectedDate } = usePeriodStore.getState();
  return { year, month, selectedDate };
}

describe('periodStore', () => {
  beforeEach(() => {
    usePeriodStore.getState().resetToCurrent();
  });

  it('starts on the current month, so a fresh app launch shows now', () => {
    const now = new Date();
    expect(read()).toEqual({ year: now.getFullYear(), month: now.getMonth(), selectedDate: null });
  });

  it('holds a period that was set, so a remounted screen reads it back', () => {
    usePeriodStore.getState().setPeriod(2026, 2);
    expect(read()).toEqual({ year: 2026, month: 2, selectedDate: null });
  });

  it('steps forward and back by whole months', () => {
    usePeriodStore.getState().setPeriod(2026, 5);
    usePeriodStore.getState().stepPeriod(1);
    expect(read()).toMatchObject({ year: 2026, month: 6 });
    usePeriodStore.getState().stepPeriod(-1);
    expect(read()).toMatchObject({ year: 2026, month: 5 });
  });

  it('rolls the year forward past December', () => {
    usePeriodStore.getState().setPeriod(2026, 11);
    usePeriodStore.getState().stepPeriod(1);
    expect(read()).toMatchObject({ year: 2027, month: 0 });
  });

  it('rolls the year back before January', () => {
    usePeriodStore.getState().setPeriod(2026, 0);
    usePeriodStore.getState().stepPeriod(-1);
    expect(read()).toMatchObject({ year: 2025, month: 11 });
  });

  it('keeps a selected day, so returning from a shift restores the day panel', () => {
    usePeriodStore.getState().setPeriod(2026, 2);
    usePeriodStore.getState().setSelectedDate('2026-03-15');
    expect(read().selectedDate).toBe('2026-03-15');
  });

  it('clears the selected day when the month changes — that date has no cell in the new grid', () => {
    usePeriodStore.getState().setPeriod(2026, 2);
    usePeriodStore.getState().setSelectedDate('2026-03-15');
    usePeriodStore.getState().setPeriod(2026, 3);
    expect(read().selectedDate).toBeNull();
  });

  it('clears the selected day when stepping months too', () => {
    usePeriodStore.getState().setPeriod(2026, 2);
    usePeriodStore.getState().setSelectedDate('2026-03-15');
    usePeriodStore.getState().stepPeriod(1);
    expect(read()).toMatchObject({ year: 2026, month: 3, selectedDate: null });
  });

  it('returns to the current month on reset, clearing the selected day', () => {
    const now = new Date();
    usePeriodStore.getState().setPeriod(2020, 4);
    usePeriodStore.getState().setSelectedDate('2020-05-10');
    usePeriodStore.getState().resetToCurrent();
    expect(read()).toEqual({ year: now.getFullYear(), month: now.getMonth(), selectedDate: null });
  });
});
