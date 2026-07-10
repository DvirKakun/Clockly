---
name: security-review
description: Run before opening or updating any PR that touches Supabase schema/migrations, auth, src/hooks (data access), or anything handling salary/tax data. Verifies multi-tenant isolation and data handling.
---

# Security & Isolation Review Skill

## Purpose

Clockly stores salary, tax, and employment data per user. The single most important invariant in this codebase is: **user A can never read or write user B's data.** This skill exists to check that invariant every time the schema or data-access layer changes.

## Input

Any new/changed SQL migration, any new Supabase table or RPC, any new `src/hooks/use*.ts` file, and the diff to `AuthPage.tsx` / `authStore.ts` if auth flow changes.

## Checklist

**Row Level Security**
- [ ] Every new table has `alter table ... enable row level security;` in the same migration that creates it — never a follow-up migration (a table with RLS off, even briefly, is a real exposure window).
- [ ] Every policy filters on `(select auth.uid())` (wrapped in `select` for the performance reason already applied to the existing tables — see `optimize_rls_auth_calls` migration), not a client-supplied `user_id` parameter.
- [ ] Child tables (like `breaks` → `shifts`) enforce ownership via an `exists (select 1 from parent where parent.user_id = (select auth.uid()))` policy, not just a foreign key.
- [ ] If a table references another table the user doesn't directly own the FK on, add a trigger enforcing cross-table ownership consistency (see `enforce_shift_workplace_ownership` on `shifts`) rather than trusting the app layer alone.
- [ ] After applying any migration, run the Supabase `get_advisors` (security) check and resolve or explicitly justify every new WARN/ERROR.

**Application layer**
- [ ] No `src/hooks/use*.ts` mutation trusts a client-supplied `user_id`/owner id for anything security-relevant — it must come from `useAuthStore`'s session, and RLS must independently enforce it (defense in depth, not either/or).
- [ ] No raw SQL string concatenation anywhere (Supabase client parameterizes automatically — a raw `.rpc()` or `execute_sql` call with interpolated user input is the one place this could regress).
- [ ] `.env` / anon key / any secret never appears in a commit (anon key in `.env.example` is intentionally a placeholder, not the real key).

**Data handling**
- [ ] Salary/tax fields (`hourly_rate`, `monthly_salary`, tax profile fields) are never logged to `console.*` in a way that would land in error-tracking/analytics.
- [ ] No new third-party script/analytics SDK is added without checking what it collects — the product principle from the original spec is minimum data collection.

## Gate

**Fail** (block merge, no exceptions): a new/changed table without RLS enabled, a policy missing an owner check, a security advisor ERROR left unresolved, a secret committed.
**Warn**: security advisor WARN that's a documented false positive (e.g. trigger-function RPC-exposure warnings — see README/commit history for the precedent), missing defense-in-depth trigger on a new child table.

## How it runs

Any migration MUST be applied via Supabase MCP `apply_migration` (or `supabase` CLI) followed immediately by `get_advisors(type: "security")` in the same session — never merge a schema change without having run that check at least once against the real project. For the application-layer checks, run this skill (or ask Claude Code to apply this checklist) against the diff before opening the PR. There is currently no automated CI gate for RLS-on-every-table (Postgres schema isn't visible to GitHub Actions in this setup) — this is a manual/AI-review-only gate today; a future improvement would be a CI job that runs `list_tables` via the Supabase CLI against a shadow DB and asserts `rls_enabled: true` on every table.
