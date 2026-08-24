# Specs — Shift UX Overhaul (branch `feature/shift-ux-overhaul`)

User-reported tasks, each specced separately and shipped as its own phase/commit on this branch.
Nine were reported together; #10 was added afterwards as a follow-on to #2. Written with the `to-spec` template (Problem → Solution → User Stories → Implementation
Decisions → Testing Decisions → Out of Scope → Further Notes).

> **Issue tracker.** This project has no configured issue tracker / triage-label vocabulary, so
> these specs live in the repo instead of being published as issues. Each is the `ready-for-agent`
> equivalent: self-contained enough to implement without re-reading the conversation.

| # | Phase | Spec | Surface |
|---|---|---|---|
| 1 | Detailed month summary on the shifts screen | [01-shifts-summary.md](01-shifts-summary.md) | ShiftsPage, shared summary component |
| 2 | Selected month persists across navigation | [02-period-persistence.md](02-period-persistence.md) | Dashboard, Shifts, Reports, shift form |
| 3 | Cycle the metric shown on each shift row | [03-shift-row-metric.md](03-shift-row-metric.md) | ShiftsPage list |
| 4 | Additions fields use a `0` placeholder, not a literal `0` | [04-additions-placeholder.md](04-additions-placeholder.md) | ShiftFormPage |
| 5 | Cycle the metric shown on calendar cells | [05-calendar-metric.md](05-calendar-metric.md) | ShiftsPage calendar |
| 6 | Swipe between days inside the shift screen | [06-shift-day-paging.md](06-shift-day-paging.md) | ShiftFormPage |
| 7 | The cyan summary card's affordance | [07-summary-card-affordance.md](07-summary-card-affordance.md) | DashboardPage |
| 8 | Surface bonuses & tips on Home and in the summary | [08-bonuses-visibility.md](08-bonuses-visibility.md) | DashboardPage, summary component |
| 9 | Tapping a workplace opens that workplace's report | [09-workplace-report.md](09-workplace-report.md) | DashboardPage, ReportsPage |
| 10 | The + button opens on the month being viewed | [10-add-shift-uses-viewed-month.md](10-add-shift-uses-viewed-month.md) | BottomNav |

## Shared seams introduced

These are the testable seams the nine phases build on. The repo tests **pure lib modules only**
(`src/lib/**/__tests__`, Vitest) — there is no component-test harness and none is introduced, so
logic is pushed down into pure modules and asserted there. That is the highest available seam.

| Seam | Module | Serves |
|---|---|---|
| A | `src/store/periodStore.ts` — app-wide selected `{year, month}` | 2, 7, 9, 10 |
| B | `src/lib/shiftMetrics.ts` — metric vocabulary, extraction, formatting, cycling | 3, 5 |
| C | `src/lib/calc/monthSummary.ts` — roll-up totals (bonuses, tips, travel, meals, overtime, Shabbat) | 1, 8 |
| D | `src/components/summary/MonthSummaryDetails.tsx` — one breakdown UI, three call sites | 1, 8, 9 |
| E | `src/lib/shiftNavigation.ts` — pure prev/next-day resolution over a shift list | 6 |
| F | `?workplace=<id>` search param on `/reports` | 9 |

Seams B, C, E are pure and unit-tested. A is a tiny Zustand store, unit-tested as a reducer.
D and F are presentational/routing and are verified in the running app.
