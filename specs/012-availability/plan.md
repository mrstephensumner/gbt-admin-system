# Implementation Plan: Talent Availability

**Branch**: `012-availability` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

## Summary

An Availability tab per speaker: a Monday-first month calendar with prev/next navigation showing
dated entries in four fixed states (available/pencilled/confirmed/blocked), a "This month" list, a
default-working-week setting, and a deferred Google Calendar connect. Entries are all-day date
ranges stored in a new `talent_availability` table; the working week is a new column on `talent`.
All changes are attributed into the existing change-record fabric; nothing is publish-safe.

## Technical Context

**Language/Version**: TypeScript, React 19, Hono on Cloudflare Workers.
**Primary Dependencies**: Hono, Drizzle over D1, React Router, design-system Badge tones, Lucide.
**Storage**: D1 — new `talent_availability` table + `working_week` column on `talent` (migration
`0010_availability.sql`). No R2.
**Testing**: Vitest (unit — state vocab/tones, cell precedence, month-grid + overlap maths),
`@cloudflare/vitest-pool-workers` (integration — CRUD, month filter, validation, publish-safe,
change records), Playwright (e2e — calendar renders, block dates, list, working week).
**Target Platform**: Single Worker (SPA + API) behind Access.
**Project Type**: Web application, established `app/` layout.
**Performance Goals**: One indexed query per month view; pure client-side grid layout.
**Constraints**: Fixed state vocabulary; internal-only (no publish-safe leak); all-day dates.
**Scale/Scope**: Per-speaker; one table + one column; one tab; four entry endpoints + a settings
endpoint.

## Constitution Check

- **I. Spec-Driven**: PASS — spec done (mockup-driven); plan precedes code.
- **II. Repository is documentation of record**: PASS — artifacts committed with code; CHANGELOG +
  case-study updated at implementation. No new ADR (operates within existing decisions).
- **III. Design-system conformance**: PASS — calendar grid, cells, badges, legend and Sync panel
  rebuilt to the mockup with design-system tokens/Badge tones; Lucide icons.
- **IV. One source of truth, multi-brand**: PASS — availability is per-speaker operational data;
  no brand coupling.
- **V. Operational, not promotional**: PASS — dense, functional calendar; **fixed** four-state
  vocabulary + shared date formatters. The mockup's casual cell synonyms are standardised to the
  legend words (documented) — no new fixed-vocabulary exception.
- **VI. Verified before merged**: PASS — unit/integration/e2e; date-maths and precedence get
  exhaustive unit tests; publish-safe exclusion tested.

**Result**: PASS. No Complexity Tracking entry.

## Project Structure

```text
app/
├── shared/availability.ts            # NEW — states, labels, tones, working-week options, precedence, month-grid helper
├── drizzle/0010_availability.sql     # NEW — talent_availability table + working_week column
├── worker/
│   ├── db/schema.ts                  # +talentAvailability table, +working_week column on talent
│   ├── services/availability.ts      # NEW — list(month), create, update, remove, setWorkingWeek + change records
│   └── routes/availability.ts        # NEW — GET (month), POST, PATCH, DELETE entry; PATCH settings
├── src/
│   ├── routes/availability-tab.tsx   # NEW — month calendar + list + Sync panel + add/edit dialog
│   ├── routes/talent-profile.tsx     # wire real tab (replace placeholder); +history/dashboard labels
│   └── lib/types.ts                  # +Availability types
└── tests/
    ├── unit/availability.test.ts
    ├── integration/availability.test.ts
    └── e2e/us-availability.spec.ts
```

**Structure Decision**: Extend the `app/` web app in the spec 005–011 shape (shared vocab module,
service, route group, profile tab, three test tiers). The only new surface is a client-side month
grid, kept in `shared/availability.ts` as pure, testable date maths.

## Phase 0 — Research

See [research.md](research.md): state vocabulary reconciliation, all-day date model + overlap
query, cell precedence, working-week storage, Google Calendar deferral, publish-safe.

## Phase 1 — Design & Contracts

- [data-model.md](data-model.md) — table, column, states/tones, precedence, month-grid rule.
- [contracts/availability.md](contracts/availability.md) — the five endpoints + validation +
  publish-safe exclusion.
- [quickstart.md](quickstart.md) — validation scenarios.

### Post-Design Constitution Re-Check

PASS — no brand coupling, no publish-safe leak, fixed vocabulary. Unchanged.
