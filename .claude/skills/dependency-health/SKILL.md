---
name: dependency-health
description: Run whenever a PR adds or upgrades an npm package. Verifies the package is maintained, license-compatible, and free of known vulnerabilities before it enters the codebase.
---

# Dependency & Package Health Skill

## Purpose

Every dependency is a piece of code Clockly ships to users and trusts with their salary/tax data. This skill is the gate before a new package lands, not a periodic audit after the fact.

## Input

The diff to `package.json` / `package-lock.json`.

## Checklist

For every **new** dependency (not existing ones, unless being upgraded):

- [ ] `npm audit` reports no new high/critical vulnerability introduced by this package or its transitive deps.
- [ ] The package has had a release within roughly the last 12 months (check `npm view <pkg> time.modified`), or is a stable/finished-scope package (e.g. small, single-purpose utilities that legitimately stop changing) — flag anything that looks abandoned.
- [ ] License is MIT/Apache-2.0/BSD or similarly permissive. No GPL/AGPL/other copyleft license without an explicit decision (none currently in the tree).
- [ ] Weekly download count / GitHub stars are not the bar by themselves, but a package with near-zero adoption and no alternative track record is a flag, not an auto-fail — prefer an established alternative if one exists with equivalent functionality (this is why the initial stack picked `lucide-react` over a niche icon set, and `date-fns` over hand-rolled date math).
- [ ] It is actually used after merge — see the Performance skill's "unused dependency" check. A package added "for later" with no import anywhere is a fail here too.
- [ ] For anything touching auth/crypto/payments-adjacent surfaces (none yet, but e.g. a future payslip-PDF signing library), extra scrutiny: prefer packages with visible security-disclosure history over ones with none (silence can mean no one's looking, not no problems).

For **upgrades**:
- [ ] Check the changelog for breaking changes between current and target version, especially for `@supabase/supabase-js`, `react-router-dom`, and `vite-plugin-pwa` — these have had breaking major-version changes before.
- [ ] Run the full test suite and a manual smoke pass after any major-version bump before merging.

## Gate

**Fail**: `npm audit` reports a new high/critical vulnerability with an available fix, a copyleft license with no explicit sign-off, a dependency that's unused after merge.
**Warn**: package unmaintained for >12 months but no better alternative exists, moderate-severity audit finding with no fix yet available (document and revisit).

## How it runs

`.github/workflows/pr-checks.yml` runs `npm audit --audit-level=high` on every PR touching `package.json`/`package-lock.json` and fails the check on a new high/critical finding. License and maintenance-status checks are not mechanically enforced in CI today — run this skill's checklist manually (or via Claude Code) before adding a dependency, and note the reasoning in the PR description when it's not obvious.
