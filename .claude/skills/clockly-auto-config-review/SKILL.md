---
name: clockly-auto-config-review
description: Run before opening or updating any PR that adds a user-facing input, toggle, or setting (per-shift or per-workplace). Verifies the value couldn't instead be derived automatically from data Clockly already has, before accepting it as something the user must configure.
---

# Auto-Config Review Skill

## Purpose

Clockly's product bet is that a shift worker opens the app, taps clock-in/clock-out (or fills in a start/end time), and gets a legally correct paycheck estimate — without re-learning Israeli labor law field-by-field. Every toggle, dropdown, or manual entry we add is friction charged to that promise. This skill exists to stop a manual field from shipping when the same value is already computable from data the app has: the shift's date/time, the workplace's location, the Hebrew calendar, or the user's own shift history.

This isn't "never ask the user anything" — some facts (a commute cost, a contractual weekly pattern that deviates from what was actually worked) are genuinely not derivable and must be entered once. The bar is: could this be computed instead of asked, and if not, can it at least be asked *once* (per workplace) instead of *every time* (per shift)?

## Input

The diff to any `src/routes/**FormPage.tsx`, `src/routes/**/*Page.tsx` form, or new column added to `workplaces`/`shifts`/`profiles`/`tax_profiles`. Also re-run this against `src/lib/calc/**` whenever a new legal input is introduced there.

## Checklist

**Before adding any new manual input (toggle, dropdown, free-text, date/time field) to a per-shift form:**
- [ ] Is this value a pure function of data already on the shift (date, start_time, end_time)? (e.g. whether a shift crosses midnight is `end_time <= start_time` — never ask.)
- [ ] Is this value a pure function of the shift's *date* against a public calendar (Shabbat via sunset/nightfall for `Asia/Jerusalem`, or Israeli statutory holidays via the Hebrew calendar)? If so, compute it and pre-fill/auto-select, don't require a manual choice — but keep a visible override, since payroll-affecting auto-detection can be wrong (DST edge cases, disputed twilight boundary, local custom) and the user must be able to correct it without fighting the UI.
- [ ] Is this value a pure function of the user's *own shift history* (e.g. how many distinct days were actually worked this calendar week, which determines the 5-day/6-day daily-overtime threshold)? If so, derive it from `useShiftsForRange`-style queries instead of asking the user to pre-declare a fixed weekly pattern that shift-workers with irregular schedules don't have.
- [ ] If the value genuinely cannot be derived (a commute cost, an hourly rate, a start date establishing seniority) — is it being asked *once per workplace* rather than *once per shift*? Anything that's constant across a user's shifts at one employer belongs on `WorkplacesPage`, not `ShiftFormPage`.
- [ ] Every auto-derived value still has a way to see what was inferred and override it — a silent auto-decision the user can't inspect or correct is worse than asking, because a wrong payroll number with no visible cause erodes trust in every other number on the screen.

**Before adding a new astronomical/calendar dependency (sunset, Hebrew calendar, etc.):**
- [ ] The computation must be timezone-correct against `Asia/Jerusalem` and must not require special-casing for the summer/winter clock change — if DST needs an `if` statement anywhere in the new code, that's a sign the timezone conversion is being done by hand instead of through the IANA tz database, and it will eventually drift wrong on a transition date.
- [ ] Prefer a small, well-established library (`suncalc` for sunset, `@hebcal/core` or its lighter date-only subset for the Hebrew calendar) over hand-rolled astronomical formulas — this is exactly the kind of "looks simple, is actually a minefield of leap years and equation-of-time correction" problem worth not reinventing. Run it past the `dependency-health` and `performance-review` skills like any other new dependency.
- [ ] Any auto-detected boundary that rests on a debatable legal/religious convention (e.g. exactly how many minutes after sunset Shabbat ends) is documented inline with the convention chosen, and surfaced to the user as an estimate somewhere in the UI — same disclaimer pattern already used on `RightsPage`.

## Gate

**Fail** (block merge): a new per-shift manual field added for a value that is a pure function of the shift's own date/time fields (midnight-crossing is the canonical example — this must never regress to a manual toggle).
**Warn**: a new per-shift field for a value that's a pure function of date+public-calendar or of the user's own shift history, without at least a documented reason auto-derivation was deferred; a per-workplace-derivable value implemented as a per-shift field; an auto-derived value with no visible override.

## How it runs

Run this skill (or ask Claude Code to apply this checklist) against any diff that adds a form field, before opening the PR — same as the other `clockly-*` review skills. There's no mechanical CI check for this one; it's a design-judgment gate, not a lint rule.
