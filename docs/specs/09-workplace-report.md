# Spec 09 — Tapping a workplace opens that workplace's report

## Problem Statement

Home lists a card per workplace with that employer's gross, hours, overtime and Shabbat pay. The
cards are pure readouts — nothing happens when tapped. That is a dead end at exactly the point the
user has a question: they have just seen that one job produced an unexpected figure, and the
obvious next move is "show me that job's month". Instead they must go to Reports, which renders
*every* workplace's table stacked together, and scroll to find the employer they cared about.

For a multi-employer user this is the difference between checking one payslip and wading through
all of them. It also matters because payslips are per-employer: a user reconciling one job's
payslip needs one job's figures, not a combined view.

## Solution

A workplace card on Home becomes tappable and opens the report **filtered to that workplace** for
the selected month — its itemized breakdown and its shift table, without the other employers.
The report gains a visible filter state with a one-tap way back to all workplaces, so the filtered
view is obviously a filter rather than a different screen.

## User Stories

1. As a multi-employer user, I want to tap a workplace on Home and see that workplace's report, so
   that I can investigate one job directly.
2. As a user, I want the filtered report to cover the month I was viewing on Home, so that the
   figure I tapped is the figure I land on.
3. As a user, I want to see that the report is filtered, so that I do not mistake one job's totals
   for my whole month.
4. As a user, I want a one-tap way to clear the filter, so that I can get back to the full report
   without navigating away.
5. As a user, I want the filtered report's shift table to list only that workplace's shifts, so
   that the detail matches the header.
6. As a user, I want the workplace card to look tappable, so that I know the interaction exists.
7. As a user, I want to export the filtered report, so that I can send one employer's figures on
   their own.
8. As a user, I want Back to return me to Home on the same month, so that the round trip is free.
9. As a single-workplace user, I want tapping my one workplace to still work sensibly, so that the
   behaviour is not multi-employer-only.
10. As a user, I want the payslip comparison to follow the filter, so that I compare against the
    right employer's payslip.
11. As a keyboard user, I want to focus and activate a workplace card with the keyboard.
12. As a screen-reader user, I want the card announced as a button naming the workplace and its
    action.

## Implementation Decisions

- **`/reports` gains a `?workplace=<id>` search param (seam F).** A URL param is right here where
  it was wrong for the month (Spec 02): the filter is a genuine view identity worth linking to and
  worth having in history, and it is set by a deliberate navigation rather than by repeated
  stepping, so it does not pollute the back stack.
- **Home's workplace cards become buttons** wrapping the existing `Card`, using the same
  `<button className="text-start">` pattern as the other tappable cards, with a chevron added for
  affordance (story 6) — consistent with the fix in Spec 07.
- **Reports filters its already-computed summary.** `computeMonthSummary` returns `byWorkplace`, so
  the filter selects that entry rather than recomputing its gross.
- **The per-workplace net figure reuses `expectedForWorkplace`**, the function the payslip-comparison
  card already relies on. This matters: statutory deductions are normally computed on *aggregate*
  taxable gross, because tax brackets and the Bituach Leumi ceiling are shared across employers, so
  naively re-running the net engine per workplace and calling the result "that job's net" would be
  wrong. `expectedForWorkplace` is the codebase's sanctioned answer — it computes the workplace's
  figures *as if this were the person's only income*, which is exact for a single-job user and an
  estimate for a multi-job user, and its own docstring records that contract.
- **The multi-employer caveat is surfaced, not hidden.** When the user has more than one active
  workplace, the filtered report states that the tax lines are an estimate pending תיאום מס and
  points to the unfiltered report for the true combined net. With a single workplace no caveat is
  shown, because none applies. This mirrors what the payslip-comparison card already does rather
  than inventing a second treatment.
- **The existing per-workplace payslip comparison** is filtered to match (story 10).
- **An invalid or archived `workplace` id** falls back to the unfiltered report rather than
  rendering an empty screen.
- **Export follows the filter** (story 7): the Excel/PDF export receives the filtered summary.
- **Depends on Spec 02** for the month to carry across (story 2) and shares the affordance pattern
  established in Spec 07.

## Testing Decisions

The logic worth testing is the filtering itself and the guard around it, both pure once
`computeMonthSummary`'s output is in hand.

- **A pure `filterSummaryToWorkplace(summary, workplaceId)` helper is the unit under test**:
  filtering to a workplace that exists returns only that entry with its gross intact; an unknown or
  archived id returns the unfiltered summary; filtering a single-workplace summary is a no-op
  (story 9); and the summary's aggregate `net`/`takeHomePay` are carried through **unchanged**
  rather than silently recomputed from the filtered subset — the assertion that pins the
  correctness decision above, since the per-workplace net comes from `expectedForWorkplace`
  instead.
- **`expectedForWorkplace` already has coverage** in `payslipCompare.test.ts`; this spec adds no
  new net-calculation logic, which is precisely why it is safe.
- **Prior art:** `src/lib/__tests__/payslipCompare.test.ts`, which already tests per-workplace
  derivation from a month summary and is the closest existing analogue.
- **Verified in the running app:** tapping a workplace opens the filtered report on the right
  month; the filter state and its clear control are visible; Back returns to Home on that month;
  export produces the filtered figures.

## Out of Scope

- Implementing any *new* per-employer tax logic. The report reuses `expectedForWorkplace` as-is;
  real תיאום מס modelling remains out of scope.
- A combined "net across all employers, split by employer" view.
- Filtering the shifts screen or Home by workplace.
- A workplace-level settings or edit shortcut from the card (Workplaces owns that).
- Comparing two workplaces side by side.

## Further Notes

The tax-aggregation constraint is the substantive point in this spec and the reason it is not
simply "filter the array". The naive implementation — re-running the net engine on one workplace's
gross — would produce a plausible-looking per-job net that no payslip would match. The codebase
already solved this for the payslip-comparison card via `expectedForWorkplace`, whose docstring
states the "as if this were the only income" contract and its multi-job caveat, so this spec reuses
that rather than inventing a parallel answer.
