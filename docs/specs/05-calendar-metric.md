# Spec 05 — Cycle the metric shown on calendar cells

## Problem Statement

The calendar is the shifts screen's default view, and it is the least informative one. A day with
shifts shows the date and up to three coloured dots. The dots say *that* the user worked and for
whom, but nothing about how much — not pay, not hours, nothing. To learn anything numeric the user
must tap a day and read the panel below, one day at a time. The month-at-a-glance view, which is
where users spend most of their time, cannot answer the one question the app exists to answer.

## Solution

Calendar cells display a number under the date — the same switchable metric as the list (Spec 03),
driven by the same control: pay, hours, extras, or rate. One tap on the arrows re-renders the whole
month, so the user can scan a calendar of daily pay, then a calendar of daily hours, and see the
shape of their month immediately.

## User Stories

1. As a shift worker, I want each calendar day to show what I earned that day, so that I can see
   my month's earnings at a glance.
2. As a shift worker, I want to switch the calendar to hours, so that I can spot my long days.
3. As a shift worker, I want to switch the calendar to extras, so that I can find the days that
   carried bonuses or tips.
4. As a shift worker, I want to switch the calendar to rate, so that I can spot a day priced
   wrongly.
5. As a shift worker, I want the metric I picked in the list to carry over to the calendar, so
   that switching views does not reset my choice.
6. As a shift worker with two shifts on one day, I want the cell to show the day's combined
   figure, so that the number matches the day, not one arbitrary shift.
7. As a shift worker, I want days with no shifts to stay visually quiet, so that the worked days
   stand out.
8. As a shift worker, I want to still see which workplaces I worked for that day, so that adding
   numbers does not cost me the colour coding.
9. As a shift worker, I want the number to stay legible on a small phone, so that the calendar
   does not become an unreadable grid.
10. As a shift worker, I want large amounts abbreviated rather than clipped, so that a four-figure
    day still fits its cell.
11. As a shift worker, I want tapping a day to still open that day's shifts, so that the existing
    interaction is unchanged.
12. As a Hebrew-speaking user, I want the numbers laid out correctly in an RTL grid, so that they
    read naturally.
13. As a screen-reader user, I want a day's cell to announce the date and its value with units, so
    that the grid is navigable without sight.

## Implementation Decisions

- **The cell value is a per-day aggregate**, not a per-shift one: the day's shifts are summed for
  the active metric. For `rate`, summing is meaningless, so a multi-shift day shows the rate when
  all its shifts share one and an indicator otherwise. This rule lives in the pure module, not the
  cell.
- **`shiftMetrics` (seam B) gains a day-level function** — `dayMetricDisplay(metric, grossResults)`
  — beside the per-shift one from Spec 03. Both views therefore format through the same module and
  cannot disagree.
- **Compact formatting for the grid.** A calendar cell is far narrower than a list row, so the day
  value uses an abbreviated form (thousands as `1.2k`) below a threshold width, while the list
  keeps full precision. The abbreviation is part of the pure module and unit-tested, not an
  inline template in the cell.
- **The dots stay.** Workplace colour dots remain, moved to a compact row so the cell carries date,
  value and dots without growing. Days with no shifts render only the date, unchanged.
- **One shared `MetricSwitcher`** above the view toggle drives both views (see Spec 03); this spec
  adds no second control and no second piece of state.
- **The `aspect-square` cell and the existing touch-target note stand.** The file already documents
  why a strict 44px target is not achievable in a 7-column grid on a 360px phone and why that is an
  accepted, standard exception; adding a value line does not change that reasoning and the comment
  is preserved.
- **Accessibility.** Each day button gets an `aria-label` combining the weekday, date and the
  metric value with its unit, so the value is not conveyed by position alone.

## Testing Decisions

The externally visible contract is "these shifts on this day, under this metric, produce this
string". That is pure, and it is where the risk actually lives (aggregation and abbreviation), so
it is the seam.

- **`dayMetricDisplay` is the unit under test**: one shift, several shifts summed, zero shifts;
  each metric; and the `rate` rule for a day whose shifts share a rate versus one whose shifts do
  not.
- **The abbreviation helper is unit-tested** at its boundaries: just under and just over the
  threshold, exact thousands, and rounding.
- **Edge cases:** a day whose total is exactly zero, a day mixing a paid and an unpaid shift, and
  non-finite input (must not render `NaN`).
- **Prior art:** `src/lib/__tests__/calendarGrid.test.ts` — the existing pure test for the calendar
  grid's day generation; this extends the same testing story from "which days" to "what each day
  shows".

## Out of Scope

- Changing which days the grid contains (`getMonthGridDays` is untouched).
- A week view or a multi-month view.
- Colouring cells by value (a heat-map) — considered and deferred; it competes with the existing
  Shabbat/holiday and selection colours.
- Showing values on adjacent-month padding days, which stay dimmed and inert.

## Further Notes

This phase is where the calendar stops being a date picker and becomes the app's main readout, so
it is worth reviewing on a real phone in both themes before approving — cell density is the risk,
and it is not visible on a desktop browser at full width.
