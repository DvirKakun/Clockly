/**
 * Resolves which shift sits either side of the one being edited, so the shift screen can page
 * between days without going back out to the list.
 *
 * Paging is over *shifts*, not calendar days: the screen edits a shift, so landing on a day with
 * no shift would mean showing an editor for nothing. Days without shifts are skipped, and the
 * control names the date it will move to so the skip is visible rather than silent. A day with two
 * shifts is therefore two stops, not one.
 */

export interface ShiftNeighbour {
  id: string;
  date: string;
}

export interface ShiftNeighbours {
  /** The chronologically earlier shift, or null at the start of the loaded range. */
  previous: ShiftNeighbour | null;
  /** The chronologically later shift, or null at the end of the loaded range. */
  next: ShiftNeighbour | null;
  /** 1-based position of the current shift, or null when it isn't in the list. */
  position: number | null;
  total: number;
}

interface OrderableShift {
  id: string;
  date: string;
  start_time: string;
}

/**
 * Sorted defensively rather than trusting input order: the list comes from a TanStack Query cache
 * that optimistic mutations append to, so a freshly created or edited shift can sit out of order
 * until the refetch settles.
 */
function chronological<T extends OrderableShift>(shifts: T[]): T[] {
  return [...shifts].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
}

export function resolveShiftNeighbours(shifts: OrderableShift[], currentId: string | undefined): ShiftNeighbours {
  const empty: ShiftNeighbours = { previous: null, next: null, position: null, total: shifts.length };
  if (!currentId) return empty;

  const ordered = chronological(shifts);
  const index = ordered.findIndex((s) => s.id === currentId);
  // Not in the loaded range (e.g. opened by deep link from another month) — offer no paging
  // rather than paging from an arbitrary anchor.
  if (index === -1) return empty;

  const at = (i: number): ShiftNeighbour | null =>
    i >= 0 && i < ordered.length ? { id: ordered[i].id, date: ordered[i].date } : null;

  return {
    previous: at(index - 1),
    next: at(index + 1),
    position: index + 1,
    total: ordered.length,
  };
}
