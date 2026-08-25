import { describe, expect, it } from 'vitest';
import { resolveShiftNeighbours } from '../shiftNavigation';

const shift = (id: string, date: string, start_time = '09:00') => ({ id, date, start_time });

const month = [
  shift('a', '2026-03-02'),
  shift('b', '2026-03-05'),
  shift('c', '2026-03-11'),
  shift('d', '2026-03-20'),
];

describe('resolveShiftNeighbours', () => {
  it('finds the shift either side of the current one', () => {
    const { previous, next } = resolveShiftNeighbours(month, 'b');
    expect(previous?.id).toBe('a');
    expect(next?.id).toBe('c');
  });

  it('skips the days between, and names the date it lands on', () => {
    // 5 March -> 11 March: the days in between have no shifts, so they are not stops. The date
    // comes back so the control can say where it is going rather than skipping silently.
    const { next } = resolveShiftNeighbours(month, 'b');
    expect(next).toEqual({ id: 'c', date: '2026-03-11' });
  });

  it('has no previous at the start of the range', () => {
    const { previous, next } = resolveShiftNeighbours(month, 'a');
    expect(previous).toBeNull();
    expect(next?.id).toBe('b');
  });

  it('has no next at the end of the range', () => {
    const { previous, next } = resolveShiftNeighbours(month, 'd');
    expect(previous?.id).toBe('c');
    expect(next).toBeNull();
  });

  it('offers no paging for a single-shift month', () => {
    const { previous, next, position, total } = resolveShiftNeighbours([shift('only', '2026-03-02')], 'only');
    expect(previous).toBeNull();
    expect(next).toBeNull();
    expect(position).toBe(1);
    expect(total).toBe(1);
  });

  it('treats two shifts on one day as two stops, ordered by start time', () => {
    const day = [
      shift('morning', '2026-03-05', '07:00'),
      shift('evening', '2026-03-05', '18:00'),
      shift('later', '2026-03-06', '09:00'),
    ];
    const fromMorning = resolveShiftNeighbours(day, 'morning');
    expect(fromMorning.next?.id).toBe('evening');

    const fromEvening = resolveShiftNeighbours(day, 'evening');
    expect(fromEvening.previous?.id).toBe('morning');
    expect(fromEvening.next?.id).toBe('later');
  });

  it('sorts an unordered list — the cache order is not guaranteed', () => {
    // Optimistic mutations append to the cached list, so a freshly created shift can sit at the
    // end regardless of its date until the refetch settles.
    const unordered = [shift('d', '2026-03-20'), shift('a', '2026-03-02'), shift('c', '2026-03-11'), shift('b', '2026-03-05')];
    const { previous, next, position } = resolveShiftNeighbours(unordered, 'c');
    expect(previous?.id).toBe('b');
    expect(next?.id).toBe('d');
    expect(position).toBe(3);
  });

  it('reports position and total for the "n of m" indicator', () => {
    const { position, total } = resolveShiftNeighbours(month, 'c');
    expect(position).toBe(3);
    expect(total).toBe(4);
  });

  it('offers no paging when the shift is not in the loaded range', () => {
    // e.g. opened by deep link from a month that isn't loaded — better than paging from an
    // arbitrary anchor.
    const { previous, next, position } = resolveShiftNeighbours(month, 'not-loaded');
    expect(previous).toBeNull();
    expect(next).toBeNull();
    expect(position).toBeNull();
  });

  it('handles an undefined id (the new-shift form) without throwing', () => {
    const { previous, next, position } = resolveShiftNeighbours(month, undefined);
    expect(previous).toBeNull();
    expect(next).toBeNull();
    expect(position).toBeNull();
  });

  it('handles an empty list', () => {
    const { previous, next, total } = resolveShiftNeighbours([], 'a');
    expect(previous).toBeNull();
    expect(next).toBeNull();
    expect(total).toBe(0);
  });

  it('does not mutate the caller’s array', () => {
    const unordered = [shift('d', '2026-03-20'), shift('a', '2026-03-02')];
    const before = unordered.map((s) => s.id);
    resolveShiftNeighbours(unordered, 'a');
    expect(unordered.map((s) => s.id)).toEqual(before);
  });

  it('crosses a month boundary within the loaded range (custom pay periods)', () => {
    // A pay period of 15->14 puts two calendar months in one range; paging must not stop at the
    // month boundary.
    const period = [shift('feb', '2026-02-20'), shift('mar', '2026-03-03')];
    expect(resolveShiftNeighbours(period, 'feb').next?.id).toBe('mar');
    expect(resolveShiftNeighbours(period, 'mar').previous?.id).toBe('feb');
  });
});
