# Spec 12 — Tapping a shift opens a summary, not the edit form

## Problem Statement

Tapping a shift drops the user straight into an edit form. That is the wrong default for what they
almost always want, which is to *read* the shift: how long did I work, what did that day earn, how
much of it was the bonus. The form can only answer that obliquely — it shows the inputs (times, a
bonus amount) rather than the results (payable hours after breaks, which hours were paid at 125%
vs 150%, what the day totalled). The one derived figure it does show, the Shabbat-split preview,
appears only for shifts that straddle the Shabbat boundary.

So the most common action on the most common object in the app opens a screen that answers a
different question, and puts every field one stray tap away from being changed.

## Solution

Tapping a shift opens a **shift summary**: the day, the workplace, the hours actually worked and
paid, each pay tier with its hours and money, the additions (bonuses, tips, travel) and deductions,
and the shift's total. An **עריכה** button leads to the existing form, and saving there returns to
the summary showing the updated figures.

Reviewing and editing become two screens with two jobs, instead of one screen doing the second job
while the user wanted the first.

## User Stories

1. As a user tapping a shift, I want to see what it earned, so that I do not have to interpret
   input fields to answer my actual question.
2. As a user, I want to see how many hours I actually worked that day, so that I can check it
   against what I remember.
3. As a user, I want paid hours shown separately from total hours, so that I can see what unpaid
   breaks cost me.
4. As a user, I want each pay tier broken out — regular, 125%, 150%, Shabbat 150/175/200 — with its
   hours and its money, so that I can verify the premium rates were applied.
5. As a user, I want the hourly rate used, so that I can confirm the shift was priced correctly.
6. As a tipped worker, I want that shift's tips shown, so that I can check them per day.
7. As a user with a bonus, I want that shift's bonus shown, so that I can see which day it belonged
   to.
8. As a user, I want travel and meal deductions on the shift, so that the total is explainable.
9. As a user, I want the shift's total pay stated plainly, so that the screen has a conclusion.
10. As a user, I want to see the breaks I recorded and whether they were paid, so that I can check
    them without opening the form.
11. As a user, I want to see the day type (regular / Shabbat / holiday) and whether the shift
    crossed midnight, so that I understand why it was paid the way it was.
12. As a user, I want my note on the shift, so that I can remember why that day was unusual.
13. As a user, I want an edit button, so that reaching the form is one obvious tap.
14. As a user, I want saving an edit to return me to this summary with the new figures, so that I
    can immediately confirm the change did what I expected.
15. As a user, I want deleting to return me to the list, since the summary I was on no longer
    exists.
16. As a user, I want to still swipe between days, so that reviewing a month stays fast.
17. As a user, I want an open (clocked-in, not yet ended) shift to render sensibly rather than
    blank, so that the screen always says something.
18. As a Hebrew-speaking user, I want the whole screen RTL-correct and dark-mode-correct.

## Implementation Decisions

- **A new route `/shifts/:id`** renders the summary; `/shifts/:id/edit` keeps the form. Every place
  that opened a shift — the list rows and the calendar's day panel — now targets the summary.
- **A new pure module `src/lib/shiftBreakdown.ts`** turns a `ShiftGrossResult` into the ordered rows
  the screen renders: for each tier, its label, hours, multiplier and pay; then additions and
  deductions. The screen renders rows and formats nothing itself, so what "150%" means lives in one
  place and is unit-testable. Zero-valued tiers are omitted — a regular weekday shift should not
  list five empty Shabbat rows.
- **The engine is not touched.** Every figure already exists on `ShiftGrossResult` (`hours.*`,
  `hourlyRateUsed`, the six `*Pay` fields, `bonuses`, `tips`, `travelReimbursement`,
  `mealDeduction`, `otherDeduction`, `totalGross`).
- **Day paging moves to the summary** (from the edit form, where Spec 06 put it). "מסך המשמרת" —
  the screen you land on when you tap a shift — is now the summary, so that is where paging
  belongs. It is also the better home for it: paging is a *review* action, and on an edit form it
  competes with unsaved changes. `ShiftDayPager` and the swipe hook move across unchanged; the form
  keeps its unsaved-changes blocker for its own exits.
- **Save returns to the summary.** Editing an existing shift navigates to `/shifts/:id`; the
  optimistic update in `useUpdateShift` means the summary already shows the new figures on arrival.
  Creating a *single* new shift also lands on its summary (the insert returns the row id), which
  confirms what was created. A *recurring* batch returns to the list instead — there is no single
  shift to show. Deleting returns to the list.
- **Open shifts.** A shift with no `end_time` cannot be costed (`shiftRowToInput` returns null), so
  the summary shows its start time and a "still clocked in" state rather than an empty breakdown.
- **The Shabbat-split preview stays on the form**, where it belongs — it previews the effect of
  edits in progress. The summary shows the saved shift's actual tiers.

## Testing Decisions

The risk is in the breakdown derivation — which tiers appear, with what hours and money — not in
the markup. That is pure and is the seam.

- **`shiftBreakdown` is the unit under test**: a plain weekday shift lists only the regular tier; an
  overtime shift lists 125% and 150% with the right hours; a Shabbat shift lists its tiers; a shift
  with no bonus lists no bonus row; deductions appear as negatives; and the rows' pay figures sum to
  the shift's `totalGross`.
- **Edge cases:** an all-zero shift, a shift whose deductions exceed its pay, and a shift with paid
  vs unpaid breaks (payable hours below total hours).
- **Prior art:** `src/lib/calc/__tests__/grossEngine.test.ts` for the fixture shape, and
  `src/lib/__tests__/shiftMetrics.test.ts` for turning a `ShiftGrossResult` into display rows.
- **Verified in the running app:** the navigation triangle (list → summary → edit → save → summary),
  delete returning to the list, and paging/swipe on the summary.

## Out of Scope

- Changing the edit form's fields or layout.
- A day-level screen listing every shift of a day (this is per-shift; the calendar's day panel
  already lists a day's shifts).
- Editing anything from the summary — it is a readout with one way into the form.
- Any calculation change.

## Further Notes

Spec 06 named this restructuring as out of scope and noted it "would supersede" the day paging it
was adding. That is exactly what happens here: the pager is not rebuilt, it moves.
