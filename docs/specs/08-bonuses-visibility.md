# Spec 08 — Surface bonuses and tips on Home and in the summary

## Problem Statement

The user records a bonus or tips on a shift, and then the number disappears. The dashboard's
per-workplace cards show hours, overtime and Shabbat pay — never bonuses or tips. The Reports
summary lists gross, the statutory deductions and travel — never bonuses or tips. They are folded
silently into "total gross" and cannot be seen again anywhere except by reopening the individual
shift that carries them.

For tipped workers this is close to disqualifying: tips can be a large share of monthly income,
and the app that is supposed to tell them what they earned will not tell them how much of it was
tips. It also undermines the app's core promise — the user cannot check the total is right if the
components are invisible.

## Solution

Bonuses and tips become first-class, visible figures:

- On **Home**, each workplace card shows bonuses and tips alongside the hours, overtime and
  Shabbat figures already there.
- In the **summary breakdown** (the shared component from Spec 01, used on both the shifts-screen
  sheet and the Reports screen), bonuses, tips, meal deductions and other deductions each get
  their own line, so gross is shown as the sum of its parts rather than as an opaque total.
- The **per-shift** figures are reachable through the `extras` metric from Spec 03, so a user who
  sees a monthly bonus total can find which shifts it came from.

## User Stories

1. As a tipped worker, I want to see my total tips for the month on Home, so that I know what my
   tips are actually worth.
2. As a worker who receives bonuses, I want to see total bonuses on Home, so that I can confirm my
   employer paid what was agreed.
3. As a worker with two jobs, I want bonuses and tips shown per workplace, so that I know which
   job they came from.
4. As a worker, I want the summary to break gross into base, overtime, Shabbat, bonuses and tips,
   so that I can see how the total was built.
5. As a worker, I want deductions (meals, other) itemized too, so that money taken off is as
   visible as money added.
6. As a worker whose month had no bonuses, I do not want an empty bonus line cluttering the card,
   so that the display stays clean.
7. As a worker, I want the itemized lines to add up to the stated gross, so that I can trust the
   breakdown.
8. As a worker checking a past month, I want the same detail for that month, so that the feature
   is not limited to the current month.
9. As a worker, I want to go from a monthly bonus total to the shifts that produced it, so that I
   can find an error.
10. As a Hebrew-speaking user, I want each figure labelled in Hebrew and laid out RTL, so that the
    breakdown reads naturally.

## Implementation Decisions

- **No calculation changes.** Every figure already exists on `MonthlyGrossResult` (`bonuses`,
  `tips`, `mealDeductions`, `otherDeductions`, `regularPay`, `overtimePay`, `shabbatPay`,
  `monthlyBase`) and per shift on `ShiftGrossResult`. This spec is purely about surfacing them.
- **The roll-up totals added in Spec 01 (seam C) are the data source** for the monthly figures, so
  Home and the summary read the same numbers from the same place and cannot drift apart.
- **Zero-valued lines are hidden**, following the pattern already established by `DeductionRow` on
  the dashboard and the conditional rows in the Reports summary. A month with no tips shows no tips
  line (story 6). The exception is the summary's gross breakdown, where hiding a component would
  make the itemization fail to add up — there, base pay is always shown.
- **Home's workplace card** extends its existing wrap-friendly figure row rather than gaining a new
  section, so it stays compact on a phone.
- **The summary's gross section** is ordered largest-to-smallest by nature of the data: base pay,
  overtime, Shabbat/holiday, bonuses, tips, then travel; deductions follow.
- **Travel stays outside taxable gross**, as the engine already treats it (it is added to
  take-home, not to taxable income). The breakdown preserves that distinction visually rather than
  lumping it in, since misrepresenting it would make the summary wrong.
- **Depends on Spec 01**, which introduces both the roll-up totals and the shared breakdown
  component this spec populates.

## Testing Decisions

The correctness claim is that the itemized parts equal the stated whole — a property of the
roll-up, and pure.

- **The roll-up totals are the unit under test** (extending the `monthSummary.test.ts` introduced
  in Spec 01): for a fixture spanning two workplaces and a mix of bonuses, tips, meal deductions
  and Shabbat shifts, assert each total, and assert the identity that base + overtime + Shabbat +
  bonuses + tips − deductions equals the reported taxable gross. That identity is the test that
  would actually catch a wrong breakdown.
- **Edge cases:** a month with tips but no bonuses; a workplace with bonuses and another without;
  deductions exceeding additions; a month with no shifts.
- **Prior art:** `src/lib/calc/__tests__/grossEngine.test.ts`, which already asserts component
  figures sum to `totalGross` for a single shift — this extends the same claim to the month.
- **Verified in the running app:** the Home card and the summary in Hebrew RTL and dark mode, and
  that zero-valued lines are absent.

## Out of Scope

- Adding new kinds of additions or deductions (the set is fixed by the schema).
- Editing bonuses from the summary — it stays a readout.
- Charts or trends of bonuses over time.
- Changing how bonuses are taxed.

## Further Notes

Together with Spec 01 this is the substantive answer to "I need to see bonuses and tips for every
shift": Spec 03's `extras` metric gives the per-shift view, this gives the monthly and
per-workplace view, and Spec 01 gives the itemized breakdown that ties them together.
