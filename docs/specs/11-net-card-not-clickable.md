# Spec 11 — The net card must not look tappable

> **Status: specced, queued last.** Introduced by Phase 3; the fix depends on the visual language
> Spec 07 establishes, so it lands after it.

## Problem Statement

The "נטו לתשלום" card in the month summary — shown in the shifts screen's summary sheet and on the
reports screen — is painted with the same saturated brand→cyan gradient, white text and rounded
card shape as the dashboard's headline card. It reads as the primary call to action on the screen.
It does nothing when tapped, and there is nowhere for it to go: inside the summary it *is* the
report already.

This is the same false-affordance defect as Spec 07, reintroduced by Phase 3 when the breakdown
component borrowed the dashboard card's styling. Spec 07 resolves its instance by making the card
genuinely tappable, which is only coherent if the gradient reliably *means* tappable — so a second,
inert card wearing the same paint actively undermines that fix rather than merely being confusing
on its own.

## Solution

Split the visual language so it tells the truth:

- **Saturated gradient fill = tappable.** Reserved for cards that navigate somewhere (after
  Spec 07, the dashboard headline card).
- **Tinted panel = emphasised readout.** The summary's net figure keeps its visual weight — it is
  still the most important number in the breakdown — but is rendered as a tinted, brand-coloured
  panel rather than a filled button-like card, so nothing invites a tap.

## User Stories

1. As a user reading the summary, I do not want to tap a card that does nothing, so that the screen
   does not mislead me.
2. As a user, I want the net figure to still stand out as the breakdown's conclusion, so that
   fixing the affordance does not bury the number I care about most.
3. As a user, I want tappable and non-tappable cards to look consistently different across the app,
   so that I can tell at a glance what will respond.
4. As a user on the reports screen, I want the same treatment as in the summary sheet, so that one
   component behaves identically wherever it appears.
5. As a user exporting a PDF, I want the net figure to remain legible in print, so that the export
   is still usable.
6. As a user in dark mode, I want the panel to keep sufficient contrast, so that the figure is
   readable in both themes.

## Implementation Decisions

- **The change is confined to `MonthSummaryDetails`'s net card.** It is the only inert card wearing
  the tappable paint; the dashboard's headline card keeps the gradient precisely because Spec 07
  makes it genuinely tappable.
- **Emphasis without fill.** The panel uses a brand-tinted background with brand-coloured figure
  text (the same treatment already used elsewhere in the app for non-interactive emphasis, e.g.
  the Shabbat-split preview panel on the shift form and the "return to current month" pill), rather
  than a saturated fill with white text. This keeps the figure the largest, most prominent element
  in the breakdown while removing the button cue.
- **No chevron, no press feedback, not a button.** The absence of an affordance is the point.
- **Print.** Phase 4 added print overrides so the gradient card would not print white-on-white.
  A tinted panel with dark text prints correctly without special handling, so those overrides are
  removed rather than carried forward — the fix makes the workaround unnecessary.
- **Ordering.** This lands *after* Spec 07. Landing it first would leave the app with no card that
  means "tappable", making the distinction it introduces meaningless.

## Testing Decisions

There is no logic here — it is a styling change to one card, with no branch and no computation.
Inventing a test seam would add indirection without catching anything, so this phase adds no unit
test, consistent with how the repo treats presentational concerns (the `ui-ux-review` skill covers
exactly this).

- **Verified in the running app:** the net figure still reads as the breakdown's conclusion; it no
  longer invites a tap; contrast holds in light and dark; the PDF export renders it legibly; and
  the dashboard's headline card — the one that *is* tappable — remains visually distinct from it.

## Out of Scope

- The dashboard headline card, which Spec 07 owns.
- The figures themselves or how they are computed.
- Any other card in the app.

## Further Notes

Worth recording as a lesson rather than just a fix: the defect arrived by reusing a card's styling
for a component with different behaviour. Once Spec 07 lands, "saturated gradient" is a promise
that the card navigates somewhere, and new cards should be checked against that promise.
