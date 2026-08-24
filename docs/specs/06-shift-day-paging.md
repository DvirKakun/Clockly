# Spec 06 — Move between days from inside the shift screen

## Problem Statement

Reviewing a month shift-by-shift means constant round trips. Open a shift, check it, press Back,
find the next day, tap it, open its shift — and, until Spec 02 lands, arrive back on the wrong
month each time. Anyone reconciling a payslip against a month of work does this twenty or thirty
times in a row. The shift screen knows nothing about the days around it, so the only way forward
is out and back in.

## Solution

The shift screen gains day navigation: a header showing the shift's date with previous/next
controls, plus a horizontal swipe gesture, moving to the shift on the adjacent day. Arrows and
swipe do the same thing; the arrows exist because swipe is invisible and inaccessible on its own.
The user can walk a whole month without leaving the screen.

## User Stories

1. As a user checking a month, I want to move to the next day's shift from inside the shift screen,
   so that I do not exit and re-enter for every shift.
2. As a user, I want to move to the previous day's shift the same way, so that navigation works in
   both directions.
3. As a user, I want to swipe horizontally to move between days, so that the gesture matches how
   phone apps normally page.
4. As a user who prefers buttons, I want visible arrows that do the same thing, so that I am not
   forced to discover a hidden gesture.
5. As a user, I want to see which day I am on, so that paging does not disorient me.
6. As a user, I want to know when I have reached the first or last shift of the month, so that a
   dead control is explained rather than just unresponsive.
7. As a user with unsaved edits, I want to be warned before paging away, so that I do not silently
   lose changes.
8. As a user on a day with two shifts, I want to reach both, so that paging does not skip work.
9. As a user, I want paging to be immediate, so that walking a month feels fast.
10. As a Hebrew-speaking user, I want swiping and the arrows to agree with RTL direction, so that
    "next" does not feel backwards.
11. As a user scrolling the form vertically, I do not want an accidental horizontal swipe to
    navigate, so that scrolling stays reliable.
12. As an iOS Safari user, I do not want the swipe to fight the browser's back-swipe gesture, so
    that neither becomes unusable.
13. As a screen-reader user, I want the controls labelled with the day they lead to, so that
    paging is usable without sight.
14. As a user creating a new shift, I do not want day paging at all, so that the new-shift form
    stays simple.

## Implementation Decisions

- **New pure module `src/lib/shiftNavigation.ts` (seam E)** resolves neighbours: given the shifts
  loaded for the period and the current shift id, it returns the previous and next shift ids
  ordered by date then start time, plus whether each end has been reached. All ordering and
  boundary logic lives here, not in the component.
- **Paging is over shifts, not calendar days.** The screen edits a shift, so landing on a day with
  no shift would mean showing an editor for nothing. Days without shifts are skipped and the
  header names the date being moved to, so the skip is visible rather than silent. This also
  satisfies story 8: two shifts on one day are two stops.
  *This is the one genuinely ambiguous point in the nine tasks — "swipe to other days" could also
  mean stopping on empty days and offering to create a shift. Confirm before implementing.*
- **Scope is the loaded period.** Neighbours come from the shifts the screen already has cached for
  the selected month (the same range query the list and calendar use), so paging needs no new
  fetch and is instant. Reaching the month's first or last shift disables that direction with a
  short explanatory label rather than silently crossing into an unloaded month.
- **Navigation replaces rather than pushes** (`navigate(..., { replace: true })`), so paging
  through fifteen shifts does not bury the shifts screen fifteen entries deep in history and Back
  still exits to the list in one press.
- **Unsaved-changes guard.** The form tracks whether any field differs from the loaded shift and,
  if so, confirms before paging away, reusing the existing `ConfirmDialog`. Paging is the first
  action in this form that can discard edits without leaving the screen, so this cannot be skipped.
- **Gesture handling.** The swipe is recognised only when horizontal movement clearly dominates
  vertical movement and passes a distance threshold, so vertical scrolling is never hijacked
  (story 11). The gesture is bound to the form's content area, not the viewport edge, leaving the
  iOS Safari edge-back gesture alone (story 12). Framer Motion is already a dependency and its
  drag handling is used rather than adding a gesture library.
- **RTL direction** follows the app's established convention (`MonthNavigator`): the
  left-pointing chevron advances, the right-pointing chevron goes back, and a swipe moves content
  in the direction of the finger.
- **New shifts are excluded**: `/shifts/new` renders no paging UI (story 14).

## Testing Decisions

The risk is in neighbour resolution and boundaries — ordering across a month, multiple shifts per
day, and the two ends — which is exactly what the pure module owns. Gesture recognition is not
unit-tested; it is verified on a device, as the repo does for interaction concerns.

- **`shiftNavigation` is the unit under test**: next/previous across a month; two shifts on one
  day ordered by start time; the current shift being first (no previous) or last (no next); a
  single-shift month (neither direction); an id that is not in the list (both directions empty
  rather than throwing); and an unsorted input list, since the cache's order is not guaranteed.
- **Prior art:** `src/lib/__tests__/date.test.ts` for pure date-ordering helpers, and
  `calendarGrid.test.ts` for boundary-heavy pure logic.
- **Verified in the running app:** the swipe threshold against vertical scrolling, the iOS Safari
  back-gesture interaction, and the unsaved-changes confirmation.

## Out of Scope

- Paging across month boundaries into shifts that are not loaded.
- An animated card-to-card transition (a simple immediate swap is enough here).
- Restructuring the shift screen into a day-detail screen that lists a day's shifts — a larger
  change that would supersede this one, and is not what was asked for.
- Swipe gestures anywhere else in the app.

## Further Notes

Depends on Spec 02: without a shared period, paging out of the shift screen at the end of a month
would drop the user back on the current month and undo the benefit.
