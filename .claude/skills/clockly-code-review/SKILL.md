---
name: clockly-code-review
description: Run before opening or updating any PR that touches src/. Reviews code quality, architecture, type-safety, error handling, and calc-engine edge cases against Clockly's conventions. Named clockly-code-review (not code-review) to avoid shadowing Claude Code's built-in code-review skill.
---

# Code Review Skill

## Purpose

Catch correctness bugs, architectural drift, and missing edge-case coverage before code merges — with extra scrutiny on `src/lib/calc/**`, since a silent bug there means someone's paycheck is wrong.

## Input

The current diff (`git diff main...HEAD` or the PR diff). If the diff touches `src/lib/calc/**`, also read `src/lib/calc/rates_2026.json` and the relevant `__tests__` file in full, not just the diff hunk.

## Checklist

**General**
- [ ] `npx tsc -b` passes with no errors (strict mode is on — do not add `any`, `@ts-ignore`, or `as never` escapes without a one-line comment explaining why).
- [ ] `npx oxlint` passes with no new warnings.
- [ ] No duplicated logic that already exists in `src/lib/calc`, `src/hooks`, or `src/components/ui` — reuse before rewriting.
- [ ] Error handling exists at actual boundaries (Supabase calls, form input) — not defensive code for states that can't occur.
- [ ] No new abstraction (factory, generic wrapper, config layer) unless it's used in ≥2 places today.

**Calc engine specifically (`src/lib/calc/**`)**
- [ ] Every new legal constant lives in `rates_2026.json`, never hardcoded in `grossEngine.ts` / `netEngine.ts` / `rightsEngine.ts`.
- [ ] New pay-rule branches have a matching Vitest case in `__tests__/` — at minimum: a boundary value (e.g. exactly at a tax bracket edge, exactly at the 2-tier social-security threshold), and one shift that crosses midnight if the change touches shift-time handling.
- [ ] `computeMonthlyGross`'s monthly-vs-hourly/daily split (see the comment above the function) is preserved — a monthly-salary employee's `regularPay` must stay 0.
- [ ] Multi-workplace math still routes through `computeMonthSummary` (combined `taxableGross` → single `computeNetPay` call) rather than summing per-workplace net figures — summing net-per-employer is a known-wrong shortcut for this app's model.

**Supabase / hooks (`src/hooks/**`)**
- [ ] Every new table access goes through a `useQuery`/`useMutation` hook, not an ad-hoc `supabase.from(...)` call inside a component.
- [ ] Mutations invalidate the right query keys (check `onSuccess`).

## Gate

**Fail** (block merge) on: TypeScript errors, oxlint errors, a calc-engine change with no corresponding test, or a hardcoded legal rate outside `rates_2026.json`.
**Warn** (don't block, flag in review) on: missing reuse opportunities, borderline abstractions.

## How it runs

- Locally / in a Claude Code session: invoke this skill (or the general-purpose `/code-review` skill with this checklist as context) before pushing.
- In CI: `.github/workflows/pr-checks.yml` runs `tsc -b`, `oxlint`, and `vitest run` on every PR and fails the check if any exit non-zero. The calc-engine-specific judgment calls (test coverage of *new* branches, reuse) are not mechanically checkable and need a human or Claude Code review pass — CI is the objective floor, not a substitute for this checklist.
