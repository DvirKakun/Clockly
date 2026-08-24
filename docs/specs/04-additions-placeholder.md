# Spec 04 — Additions fields use a `0` placeholder, not a literal `0`

## Problem Statement

In the shift form's "תוספות וניכויים" card, the bonus and tips fields are pre-filled with the
literal string `0`. To enter a bonus the user must first tap the field, select or delete the `0`,
and only then type — every time, for every shift. On mobile that is a fiddly extra gesture in the
most-used form in the app, and a mistake produces values like `050` or a stray `0` left in front
of the real number.

## Solution

Bonus and tips start **empty**, showing a grey `0` placeholder instead. Tapping the field gives an
empty field ready to type into. An empty field still means zero when the shift is saved, so
nothing about the calculation changes.

Travel and meal deduction are treated differently on purpose: they carry meaningful defaults from
the workplace (travel defaults to the legal daily cap), and blanking a real default would hide it.
They keep their value — except when that value is itself `0`, where the same placeholder treatment
applies.

## User Stories

1. As a user entering a bonus, I want the field to be empty when I tap it, so that I can type the
   amount without first deleting a zero.
2. As a user entering tips, I want the same, so that the two additions fields behave alike.
3. As a user, I want to still see a `0` hint in the empty field, so that I know the field is
   numeric and that leaving it empty means nothing was added.
4. As a user who leaves the fields empty, I want the shift saved with zero bonus and zero tips, so
   that an empty field is not an error.
5. As a user editing a shift that has a bonus, I want to see the real bonus, so that I can check
   and adjust it.
6. As a user editing a shift whose bonus is zero, I want an empty field with the placeholder, so
   that adding a bonus later is as easy as on a new shift.
7. As a commuter, I want the travel field to keep showing the legal daily cap that was filled in
   for me, so that I do not lose a default I rely on.
8. As a user whose workplace deducts nothing for meals, I want the meal field to show the
   placeholder rather than a literal `0`, so that it is easy to type into when a meal is deducted.
9. As a user who clears a field entirely, I want it treated as zero rather than as invalid, so
   that clearing is a safe action.
10. As a user, I want an entered value that I then clear to save as zero, so that removing a bonus
    is possible.

## Implementation Decisions

- **State holds `''` rather than `'0'`** for a zero-valued additions field. The four fields
  (bonus, tips, travel, meal) initialise through one small helper that maps a numeric value to its
  form string: zero becomes `''`, any other value becomes its string. This keeps the existing
  "form state is strings" design rather than reworking the form.
- **`placeholder="0"` on all four fields**, so an empty field reads as zero rather than as blank.
- **Submission is already correct and stays as-is**: `Number(bonuses) || 0` maps both `''` and
  `'0'` to `0`. This is worth stating explicitly because it is why the change is safe — no
  calculation, no schema and no stored value changes.
- **The workplace-default path keeps its behaviour**: switching workplace on a new shift still
  fills travel and meal from that workplace, now routed through the same helper so a `0` default
  lands as a placeholder rather than a literal zero.
- **`inputMode="decimal"`** is set alongside `type="number"` so mobile keyboards open on the
  numeric pad — a small correctness fix in the same fields, since the point of this spec is that
  these fields are quick to fill on a phone.
- **No change to `Input`**, which already forwards arbitrary input props.

## Testing Decisions

The behaviour worth pinning is the round trip: a numeric value becomes a form string, and a form
string becomes a number on save. That mapping is pure and is the seam.

- **The value↔form-string helper is the unit under test**: `0` maps to `''`; a non-zero number
  maps to its string; `''` parses back to `0`; a typed value parses back to itself; a
  non-numeric string parses to `0` rather than `NaN`.
- **Prior art:** `src/lib/__tests__/payPeriod.test.ts` — small pure helpers with boundary cases.
  The helper lives in `src/lib/` rather than inside the page component so it is reachable from a
  test at all.
- **The interaction itself is verified in the running app**: tap bonus on a new shift and confirm
  the field is empty with a grey `0` behind it, type a value, save, reopen, confirm it persisted.

## Out of Scope

- Redesigning the additions card or adding new addition types.
- Validation of negative or absurd values.
- Changing travel/meal default logic (travel still defaults to the legal cap).
- The notes field.

## Further Notes

The smallest phase of the nine, and deliberately kept that way: it touches one card in one form
and changes no calculation. It is a good first UI phase to confirm the review-and-approve loop
before the larger structural phases land.
