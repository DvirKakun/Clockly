# Spec 01 — Detailed month summary on the shifts screen

## Problem Statement

The shifts screen shows the month's shifts — as a calendar or a list — but never says what the
month adds up to. To answer "how much did I actually make this month, and what came from bonuses
versus base pay?" the user has to leave the screen and go to Reports. Reports itself only shows a
thin summary: total gross, the statutory deductions, travel, and take-home. Bonuses, tips, meal
deductions, overtime pay and Shabbat pay are all computed by the engine but never shown anywhere,
so the user cannot see where their money came from.

## Solution

A **סיכום** (Summary) button on the shifts screen opens a detailed breakdown of the currently
selected month, as a bottom sheet over the shifts screen. The breakdown is genuinely itemized:
base pay, overtime at each tier, Shabbat/holiday pay, bonuses, tips, travel reimbursement, meal
and other deductions, then the statutory deductions, then take-home — with a per-workplace section
when more than one workplace has shifts in the month.

The same breakdown component is reused on the Reports screen (Spec 08), so there is exactly one
implementation of "what a month's money looks like" in the app.

## User Stories

1. As a shift worker, I want a summary button on the shifts screen, so that I can see the month's
   total without navigating away from my shifts.
2. As a shift worker, I want the summary to open over the shifts screen, so that I keep my place
   in the month I was browsing.
3. As a shift worker, I want to see my total gross for the month, so that I know what I earned
   before deductions.
4. As a shift worker, I want to see my estimated take-home pay, so that I know what will actually
   reach my bank account.
5. As a tipped worker, I want to see my tips as their own line, so that I can tell tip income from
   wage income.
6. As a worker who receives bonuses, I want to see total bonuses as their own line, so that I can
   confirm my employer paid what was promised.
7. As an hourly worker, I want to see how much of my pay came from overtime, so that I can judge
   whether the extra hours were worth it.
8. As a worker who works Shabbat and holidays, I want to see Shabbat/holiday pay separately, so
   that I can verify the premium rate was applied.
9. As a commuter, I want to see my travel reimbursement total, so that I can check it against the
   days I actually travelled.
10. As a worker whose employer deducts for meals, I want to see the total deducted, so that I can
    dispute it if it looks wrong.
11. As a worker with more than one job, I want a per-workplace section, so that I can see which
    employer contributed what.
12. As a worker with one job, I do NOT want a redundant per-workplace section duplicating the
    totals, so that the summary stays short.
13. As a worker browsing an earlier month, I want the summary to describe the month I am looking
    at, so that the number matches the shifts on screen.
14. As a worker with no shifts in the selected month, I want the summary to say so plainly, so
    that I do not mistake an empty breakdown for a bug.
15. As a keyboard or screen-reader user, I want the sheet to trap focus and close on Escape, so
    that I am not stranded behind it.
16. As a Hebrew-speaking user, I want every label and number laid out correctly RTL, so that the
    breakdown is readable.

## Implementation Decisions

- **New shared component `MonthSummaryDetails`** (seam D) renders one month's itemized breakdown
  from a `MonthSummary`. It is presentational and data-source agnostic: it receives the computed
  summary and a `variant` controlling whether the per-workplace section is shown. It is used by
  the shifts-screen sheet (this spec), the Reports screen, and the per-workplace report (Spec 09).
- **`computeMonthSummary` gains roll-up totals** (seam C). Every figure the breakdown needs
  already exists per-workplace on `MonthlyGrossResult` (`bonuses`, `tips`, `travelReimbursement`,
  `mealDeductions`, `otherDeductions`, `regularPay`, `overtimePay`, `shabbatPay`, `monthlyBase`).
  Today the views re-reduce these ad hoc (the dashboard sums `totalHours` inline). Instead the
  summary exposes a `totals` object aggregating them once, so no view re-derives money.
  This is an additive change — existing fields keep their meaning and callers keep working.
- **The sheet is a new `BottomSheet` UI primitive** in `src/components/ui/`, since the repo has a
  modal (`ConfirmDialog`) but no sheet. It follows `ConfirmDialog`'s existing conventions:
  Framer Motion enter/exit, `role="dialog"`, `aria-modal`, backdrop click to close, Escape to
  close, and focus moved into the sheet on open and restored on close.
- **The summary reads the shifts already loaded** by the shifts screen for the selected range. It
  does not issue its own query, so opening it is instant and cannot disagree with the visible
  shifts.
- **Pay-period awareness.** The shifts screen currently ranges over a calendar month
  (`monthRange`) while the dashboard and reports use `payPeriodRange` with the user's configured
  start day. That inconsistency means a custom-period user would see a summary that disagrees with
  Reports for the same month. The shifts screen moves to `payPeriodRange` so all three screens
  describe the same window.
- **Placement.** The button sits in the shifts screen header row, beside the calendar/list toggle,
  labelled `סיכום` with a chart icon — visible in both view modes.

## Testing Decisions

A good test here asserts external behaviour — the numbers a user would read — not how the
component renders them. The repo tests pure lib modules only (`src/lib/**/__tests__`, Vitest);
there is no component-test harness and this spec does not introduce one.

- **`computeMonthSummary` roll-ups are the unit under test.** New cases in a
  `monthSummary.test.ts` assert that, for a fixture of shifts across two workplaces, `totals`
  reports the correct bonuses, tips, travel, meal deductions, overtime pay and Shabbat pay, and
  that the roll-ups equal the sum of the per-workplace figures.
- **Edge cases:** zero shifts (all totals 0, no division-by-zero), a single workplace, shifts whose
  bonuses/tips are 0, and a month where deductions exceed additions.
- **Prior art:** `src/lib/calc/__tests__/grossEngine.test.ts` and `netEngine.test.ts` — same
  fixture-and-assert-the-money shape. `payPeriod.test.ts` covers the range helper this now shares.
- **The sheet's presentation is verified in the running app**, per the repo's `ui-ux-review` skill
  (RTL, dark mode, focus trap, Escape).

## Out of Scope

- Exporting this breakdown (Reports already owns Excel/PDF export).
- Payslip comparison — it stays on Reports.
- Changing any calculation. This spec only surfaces figures the engine already produces.
- A yearly or multi-month summary.

## Further Notes

Moving the shifts screen onto `payPeriodRange` is the one behavioural change outside the summary
itself. For the default start day of 1 it is identical to today's `monthRange`; only users with a
custom pay period (e.g. 15→14) see a difference, and for them it is a fix.
