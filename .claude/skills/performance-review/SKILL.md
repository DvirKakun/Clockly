---
name: performance-review
description: Run before opening or updating any PR that adds a dependency, a new route, or touches src/App.tsx routing/lazy-loading. Verifies bundle size and load performance stay app-like.
---

# Performance & Bundle-Size Review Skill

## Purpose

A PWA that takes 4 seconds to show first content on mobile 4G doesn't feel like a native app no matter how good the animations are. This skill keeps the bundle and load path honest as the app grows.

## Input

`npm run build` output (chunk sizes), the diff to `package.json` (new dependencies), and the diff to `src/App.tsx` (routing/lazy-loading).

## Checklist

**Bundle size**
- [ ] Run `npm run build` and compare the reported chunk sizes to the last known-good baseline (as of the initial commit: main vendor chunk ~596 kB / ~177 kB gzipped, largest route chunk ~11 kB). A new dependency or route that grows the main chunk by more than ~15% needs justification in the PR description.
- [ ] Every new top-level route in `src/App.tsx` is added via `lazy(() => import(...))`, matching the existing pattern — never a static import of a page component.
- [ ] Heavy, rarely-used libraries (PDF generation, Excel export, charting) are dynamically imported at the point of use, not pulled into the main bundle — none of these exist yet, but when the reports/export phase lands, this is where it matters most.

**Dependencies**
- [ ] Any new npm package is actually imported and used — an installed-but-unused dependency (like `sharp` or `playwright` were, temporarily, during initial scaffolding) must not survive into a committed `package.json`.
- [ ] Prefer a small utility already in the codebase (`date-fns`, `clsx`) over adding a new one that does the same job.

**Runtime performance**
- [ ] Lists that can grow unbounded (shifts over time) are scoped by date range in the query (see `useShiftsForRange`), never fetched in full and filtered client-side.
- [ ] No new `useEffect` triggers a Supabase fetch on every render — check dependency arrays.
- [ ] Framer Motion animations animate `transform`/`opacity` only (GPU-friendly), consistent with the existing `PageTransition`/`Switch` components.

**PWA / offline**
- [ ] `vite-plugin-pwa`'s `workbox.globPatterns` still covers any new static asset type introduced.
- [ ] New network calls to non-Supabase origins are considered for the `runtimeCaching` config if they're needed offline.

## Gate

**Fail**: an unused dependency committed, a new top-level route imported statically instead of lazily, a query that fetches an unbounded/unfiltered table.
**Warn**: main chunk growth >15% without justification, a new `useEffect` with a suspicious dependency array.

## How it runs

`.github/workflows/pr-checks.yml` runs `npm run build` on every PR and fails if the build errors; it also runs `npm ls` diffed against `package.json` to catch dependencies present in the lockfile but unused in `src/` (best-effort static check, not exhaustive). The bundle-size-delta judgment call and the runtime-performance checklist items require a human/Claude Code pass — run this skill on the diff before opening the PR.
