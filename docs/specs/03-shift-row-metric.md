# Spec 03 — Cycle the metric shown on each shift row

## Problem Statement

A shift row in the list shows the workplace, the start–end times, and one number: total gross pay.
That is often not the number the user wants. Someone checking whether they are near the overtime
threshold wants hours. Someone verifying a promised bonus wants the bonus figure. Someone who just
changed jobs wants the hourly rate that was applied. Today the only way to see any of those is to
open each shift individually and read the form — one shift at a time, with no way to compare
across a month.

## Solution

The number on each shift row becomes a **switchable metric**. A small control above the list —
left/right arrows around the current metric's name — cycles what every row displays: pay, hours,
extras (bonuses + tips), or the hourly rate used. Switching applies to the whole list at once, so
the user can scan a month down a single column and compare like with like. The choice is
remembered.

## User Stories

1. As a shift worker, I want to switch the shift list to show hours, so that I can see at a glance
   which shifts were long.
2. As a shift worker, I want to switch the list to show bonuses and tips, so that I can find which
   shifts actually carried extras.
3. As a shift worker, I want to switch the list to show the hourly rate used, so that I can spot a
   shift priced at the wrong rate.
4. As a shift worker, I want to switch back to pay, so that pay remains the default and the easy
   case.
5. As a shift worker, I want the switch to apply to every row at once, so that I can compare
   shifts down a column rather than reading them one by one.
6. As a shift worker, I want my chosen metric remembered when I come back, so that I do not
   re-select it every visit.
7. As a shift worker, I want the metric's name shown next to the arrows, so that I always know
   what the number means.
8. As a shift worker, I want cycling to wrap around, so that I can reach any metric from any other
   with at most a couple of taps.
9. As a shift worker with a shift that has no bonus, I want a clear zero rather than a blank, so
   that I can tell "nothing" from "not loaded".
10. As a monthly-salaried worker, I want the rate metric to show the derived hourly value, so that
    the column is meaningful for me too.
11. As a Hebrew-speaking user, I want the arrows to move in the direction they point in RTL, so
    that the control does not feel inverted.
12. As a screen-reader user, I want the arrows labelled and the change announced, so that I know
    which metric is active without seeing the control.
13. As a keyboard user, I want to reach and operate the arrows with the keyboard, so that the
    control is not pointer-only.

## Implementation Decisions

- **New pure module `src/lib/shiftMetrics.ts` (seam B)** owns the metric vocabulary and all
  extraction/formatting. It exports the metric union, an ordered list, Hebrew labels, a
  `cycleShiftMetric(metric, direction)` helper that wraps, and a
  `shiftMetricDisplay(metric, gross)` that returns the formatted string for one shift's
  `ShiftGrossResult`. No component computes money or picks a format itself.
- **Metrics shipped:** `pay` (total gross, default), `hours` (payable hours), `extras`
  (bonuses + tips combined — the two the user asked to see, and separating them would make the
  cycle long), `rate` (the `hourlyRateUsed` the engine already records per shift, which is correct
  for monthly-salaried workers too since the engine derives it).
- **Formatting** reuses `formatCurrency` for money metrics; hours render as one decimal with a
  `שעות` suffix; rate renders as currency with a `/שעה` suffix. Zero renders as a real zero, never
  a blank or a dash.
- **The control is shared with the calendar (Spec 05)** — one `MetricSwitcher` component sits above
  whichever view is active, so switching metric in list view and toggling to calendar keeps the
  same metric. This is why the metric state lives on the shifts screen, not inside the list.
- **Persistence** uses `localStorage`, matching the existing precedent for the calendar/list view
  toggle (`clockly-shifts-view`). Key: `clockly-shift-metric`. An unrecognised stored value falls
  back to `pay`.
- **RTL direction.** In an RTL layout "next" advances leftward, so the left-pointing chevron moves
  forward through the list and the right-pointing chevron moves back — matching the existing
  `MonthNavigator`, which already uses `ChevronRight` for *previous* and `ChevronLeft` for *next*.
  The new control follows that established convention rather than inventing a second one.
- **Accessibility.** The arrows are real `<button>`s with Hebrew `aria-label`s; the metric name is
  a live region so a screen reader announces the change; the existing 44px touch-target convention
  applies.

## Testing Decisions

The user-visible contract is "for this shift and this metric, that string appears" plus "cycling
walks the metrics and wraps". Both are pure and belong in the lib seam — no renderer needed, which
matches a repo with no component-test harness.

- **`shiftMetrics` is the unit under test**: `cycleShiftMetric` advances, retreats and wraps in
  both directions across the full list; `shiftMetricDisplay` returns the expected string for a
  fixture `ShiftGrossResult` for each metric.
- **Edge cases:** a shift with zero bonuses and zero tips (renders a zero, not blank); a shift with
  only tips and no bonus; a non-finite rate (must not render `NaN` — `formatCurrency` already
  guards this and the test pins that behaviour); an unknown persisted metric value falling back to
  `pay`.
- **Prior art:** `src/lib/__tests__/payslipCompare.test.ts` — a pure module turning engine output
  into display-ready figures, tested the same way.

## Out of Scope

- Per-row independent metrics (the switch is list-wide by design).
- Sorting or filtering the list by the selected metric.
- Adding metrics beyond the four above (overtime-only, Shabbat-only, travel) — the module is built
  so they are a one-line addition later, but they are not shipped here.
- The calendar view, which is Spec 05 and reuses this module.

## Further Notes

Building the metric vocabulary as a pure module first is what makes Spec 05 cheap: the calendar
cell renders the same metric through the same formatter, so the two views can never disagree about
what "extras" means.
