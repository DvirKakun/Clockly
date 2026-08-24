# Spec 07 — The cyan summary card's affordance

## Problem Statement

The dashboard's headline card — estimated net pay, on a blue-to-cyan gradient — is the most
visually prominent element on the home screen. It is styled exactly like a call to action:
saturated fill, white text, high contrast against the plain white cards around it. Users tap it.
Nothing happens. The card is a static readout that looks like a button, which is the textbook
false-affordance problem: the strongest visual signal on the screen leads nowhere.

Immediately below it sit two cards that *are* buttons — "זכויות עובד" and "דוחות וייצוא" — and
they are visually quieter than the one that is not. The affordance hierarchy is exactly inverted.

## Solution

Make the card do what it looks like it does: tapping it opens the full report for the month it is
showing. It becomes a real button with a chevron matching the two genuine buttons below it, and
with the press feedback the rest of the app uses — so the strongest-looking element on the screen
is also the most useful one, and the visual language stays honest.

## User Stories

1. As a user, I want tapping the net-pay card to open the full report, so that the app responds to
   the tap I naturally make.
2. As a user, I want the card to show a chevron like the other tappable cards, so that I can tell
   before tapping that it leads somewhere.
3. As a user, I want the card to react visually when pressed, so that I get confirmation my tap
   registered.
4. As a user browsing March on Home, I want the report to open on March, so that the figure I
   tapped is the figure I land on.
5. As a user, I want to press Back from the report and return to Home on the same month, so that
   the round trip costs me nothing.
6. As a keyboard user, I want to focus and activate the card with the keyboard, so that it is not
   pointer-only.
7. As a screen-reader user, I want it announced as a button that opens the monthly report, so that
   its purpose is clear.
8. As a screen-reader user, I want to still hear the net figure and the gross and hours beneath it,
   so that making it a button does not cost me the data.
9. As a user, I want the card to keep its visual weight, so that the change fixes the behaviour
   rather than downgrading the design.

## Implementation Decisions

- **The card becomes a `<button>`** wrapping the existing `Card`, following the exact pattern the
  two cards below it already use (`<button className="text-start">` around a `Card`). No new
  interaction primitive is introduced.
- **It navigates to `/reports`.** Because Spec 02 makes the period shared, Reports opens on the
  month the dashboard was showing with no parameter passing, and Back returns to Home on that same
  month (stories 4 and 5). **This spec therefore depends on Spec 02** — landing it first would
  produce a card that jumps the user to the current month.
- **A chevron is added** in the same position and orientation as the "זכויות עובד" / "דוחות וייצוא"
  cards, tinted for the gradient background instead of the grey used on white cards.
- **Press feedback** uses the app's existing motion vocabulary (Framer Motion is already used on
  this card via `motion.div`), so the press state matches the rest of the app rather than
  introducing a new one.
- **Accessibility.** An `aria-label` names the action ("הצגת הדוח החודשי המלא") while the figures
  remain in the accessible content, so the button's purpose and its data are both available. The
  card is already well above the 44px target.
- **The alternative — removing the button-like styling — was rejected.** The user asked for either
  fix; making it functional keeps the visual hierarchy (the most important number stays the most
  prominent element) and adds a shortcut, whereas muting it would solve the confusion by making
  the home screen worse.

## Testing Decisions

There is no logic to unit-test here: the change is an element type, a navigation target and an
accessible name. Inventing a test seam for it would add indirection without catching anything, so
this phase adds no unit test and is verified in the running app instead — consistent with how the
repo already treats presentational concerns (the `ui-ux-review` skill exists for exactly this).

- **Verified in the running app:** tapping opens Reports on the same month; Back returns to Home on
  that month; keyboard focus and Enter/Space activate it; the accessible name is announced; press
  feedback is visible; the card reads correctly in dark mode and RTL.
- **Regression watch:** the two existing card buttons below must keep working unchanged.

## Out of Scope

- Redesigning the dashboard's layout or the card's gradient.
- What the report itself contains (Specs 01 and 08).
- The per-workplace cards, which are Spec 09.

## Further Notes

Small in code, and the clearest single UX defect of the nine: it is the one place where the app
actively misleads the user rather than merely omitting something.
