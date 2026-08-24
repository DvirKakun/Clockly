# Spec 10 — The + button opens on the month being viewed

> **Status: specced, not implemented.** Queued after the original nine.

## Problem Statement

The `+` button in the bottom navigation is a bare link to `/shifts/new` carrying no context, so the
new-shift form always falls back to *today's* date. Browse to March, tap `+`, and the form opens
dated today — the wrong month entirely.

That makes backfilling a past month tedious in exactly the situation where it matters most: the
user has deliberately navigated to March, the whole screen is showing March, and the one action
that creates data ignores it. Every added shift costs a manual date change, and forgetting that
change silently files the shift under the wrong month — a data error, not just an annoyance,
because it lands in the wrong pay period and quietly changes two months' totals.

Phase 2 made the selected month persist across navigation; this is the remaining place that still
ignores it.

## Solution

`+` opens the new-shift form dated inside the month the user is looking at:

- Viewing the **current** month → today's date, exactly as now.
- Viewing **another** month → the first day of that month.
- A **day selected** in the calendar → that day, so `+` matches the day panel's own add action.

## User Stories

1. As a user backfilling March, I want `+` to open a form dated in March, so that I do not retype
   the date for every shift.
2. As a user viewing the current month, I want `+` to still default to today, so that the common
   case is unchanged.
3. As a user who has selected a day in the calendar, I want `+` to use that day, so that the button
   agrees with the day panel's "הוספת משמרת".
4. As a user, I want to still be able to change the date in the form, so that the default is a
   starting point and not a constraint.
5. As a user adding several shifts to a past month, I want each `+` to keep returning to that
   month, so that the flow stays in one month.
6. As a user, I do not want a shift silently filed under the wrong month, so that my totals stay
   trustworthy.
7. As a user with a custom pay period, I want the default date to fall inside the period I am
   viewing, so that the new shift counts toward the month on screen.

## Implementation Decisions

- **`BottomNav` reads the shared period** (`periodStore`, seam A from Spec 02) and passes an
  initial date through the same `location.state.date` channel the calendar's day panel already
  uses. The shift form needs no change — it already prefers `initialDate` over `todayIso()`
  (see its `date` state initialiser), so this is a caller-side fix.
- **A pure `defaultDateForPeriod(year, month, selectedDate, today)` helper** decides the date:
  the selected day if set; today if the period is the current month; otherwise the first of the
  viewed month. Pure and total, so it is unit-testable and has no clock dependency at the seam.
- **`BottomNav` currently uses `NavLink`**, which renders active styling for `/shifts/new`. Passing
  state keeps `NavLink` (its `state` prop supports this), so the active-state styling is preserved.
- **Custom pay periods (story 7).** With a start day of 1 the first of the month is trivially
  inside the period. With a start day D > 1 the period for month M runs D of M−1 through D−1 of M,
  and the first of M is still inside it — so "first of the viewed month" satisfies story 7 for
  every configurable start day (capped at 28), without needing period-aware clamping. Worth an
  assertion so it stays true.

## Testing Decisions

The decision worth testing is the date choice, which the helper owns; the navigation itself is a
prop change verified in the app.

- **`defaultDateForPeriod` is the unit under test**: a selected day wins over everything; the
  current month yields today; a past month yields its first day; a future month yields its first
  day; and the first-of-month result falls inside the pay period for representative start days.
- **Prior art:** `src/lib/__tests__/payPeriod.test.ts` and `date.test.ts` — pure date helpers with
  a clock passed in rather than read.
- **Verified in the running app:** `+` from March opens a March-dated form; `+` from the current
  month opens today; `+` with a calendar day selected opens that day.

## Out of Scope

- Changing what the form does after saving (Spec 02 already returns it to the viewed month).
- Defaulting the *time* fields, which stay 09:00–17:00.
- The calendar day panel's own add action, which already passes its date correctly.

## Further Notes

Strictly a follow-on to Spec 02: once the app has a shared notion of "the month I am looking at",
every action that creates or reads data should respect it. This is the last one that does not.
