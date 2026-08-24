# Spec 02 — The selected month persists across navigation

## Problem Statement

Every screen that shows a month keeps its own `useState` cursor initialised to *today's* month.
Nothing shares it and nothing survives a remount, so the app constantly throws away where the user
was:

- Browse to March, tap a shift, press Back → the shifts screen remounts on the current month. The
  user has to navigate back to March to reach the next shift.
- Browse to March, edit a shift, save → `navigate('/shifts')` remounts on the current month.
- Browse to March on the shifts screen, tap Home → the dashboard shows the current month.

For anyone reviewing a past month — reconciling a payslip, the main reason to look backwards at
all — this makes the app tedious: every single action costs the user their place.

## Solution

One app-wide "selected pay period". The dashboard, the shifts screen and the reports screen all
read and write the same `{year, month}`, so moving between them — and returning from a shift —
always lands on the month the user chose. Opening the app fresh still starts on the current month.

## User Stories

1. As a user reviewing March, I want to open a shift and come back to March, so that I can work
   through that month's shifts one by one.
2. As a user reviewing March, I want to save an edited shift and stay in March, so that correcting
   several shifts does not cost me my place each time.
3. As a user reviewing March, I want to delete a shift and stay in March, for the same reason.
4. As a user reviewing March, I want to add a shift to a March day and return to March, so that
   backfilling a past month is not punishing.
5. As a user who switched the shifts screen to March, I want Home to show March too, so that the
   two screens agree about which month I am looking at.
6. As a user who switched Home to March, I want Reports to open on March, so that I do not
   re-navigate to run the report I was just looking at.
7. As a user, I want the "return to current month" pill to still work from anywhere, so that I
   always have a one-tap way back to now.
8. As a user opening the app after closing it, I want to start on the current month, so that the
   default is the month I am actually working in.
9. As a user, I want the browser Back button to leave the screen rather than step back through
   every month I browsed, so that Back stays predictable.
10. As a user with a custom pay period (e.g. 15→14), I want all three screens to use the same
    window, so that their totals agree.

## Implementation Decisions

- **A Zustand store `periodStore` (seam A)** holds `{year, month}` plus `setPeriod` and a
  `resetToCurrent` action. It is the single source of truth for the selected period. Zustand is
  already the app's UI-state tool (`authStore`, `themeStore`), so this introduces no new concept.
- **Not persisted.** The store initialises to the current month on every app start (story 8). A
  month selection is a navigational position, not a preference — persisting it would strand a user
  in a stale month days later.
- **Not stored in the URL.** URL search params were considered (they would additionally survive a
  reload and be shareable) and rejected for this iteration: with `push` semantics every arrow tap
  becomes a history entry, so Back walks month-by-month instead of leaving the screen (story 9);
  with `replace` semantics the URL stops matching history anyway, which forfeits the only real
  advantage. The store gives exactly the behaviour the stories ask for with less machinery.
  Revisit if deep-linking to a month is ever wanted.
- **All three screens drop their local cursor** and read the store instead. `MonthNavigator`'s
  props and behaviour are unchanged — the pages simply hand it the store's value and write back
  through `setPeriod`.
- **The shift form returns to where it came from.** After save and after delete it navigates to
  `/shifts`; because the shifts screen now reads the store, that lands on the selected month with
  no extra plumbing. Back (`navigate(-1)`) already returns to the correct screen and now finds the
  correct month.
- **Adding a shift from a past month's calendar day** keeps working through the existing
  `location.state.date` pre-fill; no change.
- **The shifts screen adopts `payPeriodRange`** (shared with Spec 01) so all three screens window
  identically.

## Testing Decisions

The externally observable behaviour is "the period survives navigation". The store is the seam
where that is true or false, and it is a pure reducer over `{year, month}` — testable without a
renderer, which suits a repo with no component-test harness.

- **`periodStore` is the unit under test**: setting a period, resetting to the current month, and
  month arithmetic at year boundaries (December → January advances the year, January → December
  retreats it). The boundary arithmetic currently lives inside `MonthNavigator.step`; moving it
  into a pure exported helper alongside the store is what makes it assertable.
- **Prior art:** `src/lib/__tests__/payPeriod.test.ts` and `date.test.ts` — pure functions over
  year/month values with boundary cases.
- **The navigation behaviour itself is verified in the running app**: the six navigation paths in
  stories 1–6, each confirmed to land on the chosen month.

## Out of Scope

- Deep-linking to a month by URL.
- Remembering the selected month between app launches.
- Changing the pay-period start-day setting itself (it stays on the tax profile).
- The calendar's selected *day*, which remains local to the shifts screen and is intentionally
  cleared when the month changes.

## Further Notes

This is the enabling phase for Specs 07 and 09: once the period is shared, "open the report for
this month" and "open the report for this workplace" can navigate to Reports and be confident it
shows the month the user was just looking at.
