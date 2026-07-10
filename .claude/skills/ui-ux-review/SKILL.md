---
name: ui-ux-review
description: Run before opening or updating any PR that touches src/routes, src/components, or src/index.css. Verifies the app-like mobile feel, RTL correctness, dark mode, and accessibility.
---

# UI/UX Review Skill

## Purpose

Clockly's core product bet is that it feels like a native app, not a responsive website. This skill exists to stop that bet from eroding one PR at a time.

## Input

The diff, plus the actual running app on a mobile viewport (390×844 or similar) in both light and dark mode. Static code reading is not sufficient for this skill — render it.

## Checklist

**Native feel**
- [ ] All tappable elements are ≥44×44px (buttons, nav tabs, list rows). Check `Button.tsx`'s `min-h-11` (44px) wasn't bypassed by a custom small button.
- [ ] New screens use `PageTransition` for enter/exit, not an instant swap.
- [ ] No new page introduces a browser-style full reload or `<a href>` navigation — use `react-router` `Link`/`navigate`.
- [ ] Safe-area insets respected: content that can sit near the top/bottom edge uses `var(--safe-top)` / `var(--safe-bottom)` (see `AppShell.tsx`), not a fixed padding guess.
- [ ] No visible scrollbars, no default long-press context menu on custom interactive elements (already suppressed globally in `index.css` — verify a new component doesn't re-enable `user-select` or scrollbars unintentionally).

**RTL**
- [ ] Every new component renders correctly with `dir="rtl"` (the app default) — check icon direction (e.g. chevrons), margin/padding using logical properties (`ms-`/`me-`/`ps-`/`pe-` or `inset-inline-*`) rather than physical `ml-`/`mr-`/`left`/`right`.
- [ ] Numeric/Latin content (emails, `type="time"`/`type="date"` inputs, currency figures if formatted LTR) is explicitly `dir="ltr"` where it would otherwise garble — see `Input` usage with `dir="ltr"` in `AuthPage.tsx`.

**Dark mode**
- [ ] New colors use the `dark:` variant (Tailwind v4 class-based, see `@custom-variant dark` in `index.css`) — no color that only looks right in one mode.
- [ ] Contrast holds in both modes (aim for WCAG AA, 4.5:1 for body text).

**Accessibility**
- [ ] Interactive elements have an accessible name (`aria-label` for icon-only buttons — see `BottomNav.tsx` pattern).
- [ ] Form inputs use `<label>` (via the shared `Input`/`Select` components), not a bare placeholder as the only label.
- [ ] Focus is visible and logical for keyboard/screen-reader users even though this is a touch-first app.

**Performance feel**
- [ ] No layout shift on data load — loading states use a skeleton or explicit "טוען..." rather than a blank flash.
- [ ] Animations use `transform`/`opacity` (as Framer Motion does by default here), not properties that trigger layout (`width`, `top`, `left`) — check any new custom CSS transition.

## Gate

**Fail**: touch target <44px on a primary action, RTL layout visibly broken (mirrored incorrectly, text overflow), missing dark-mode styling that makes text unreadable, missing `aria-label` on icon-only nav.
**Warn**: minor spacing/contrast nits, missing skeleton loader.

## How it runs

This is a judgment-heavy, visual skill — run it in a Claude Code session with browser access (or manually) against the dev server before opening a PR: `npm run dev`, view at a mobile viewport in both themes and both `dir="rtl"`/sanity-check `dir="ltr"` if relevant. CI cannot gate this automatically; `.github/workflows/pr-checks.yml` only runs the mechanical Lighthouse/bundle checks from the performance skill as a partial proxy.
