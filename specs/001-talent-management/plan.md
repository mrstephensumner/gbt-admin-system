# Implementation Plan: Talent Management Module

**Branch**: `001-talent-management` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-talent-management/spec.md`

## Summary

Build the first module of the GBT Admin System: a talent roster for the bookings team —
create/edit talent records with immutable `TAL-NNNN` references and full change history,
a directory that searches and filters responsively at 5,000+ records, fixed-vocabulary
status tracking, per-brand publication with completeness gating, and archive-not-delete.

Technical approach: a single Cloudflare Worker serving a React SPA (static assets) and a
Hono JSON API, backed by Cloudflare D1 (SQLite) via Drizzle ORM, with talent photos in R2.
Domain rules (status vocabulary, reference format, GBP/date formatters, fee-band
thresholds) live in one shared TypeScript package imported by both API and UI. Interim
authentication is Cloudflare Access in front of the domain, with operator identity read
from the Access-issued identity header. Full rationale in [research.md](research.md) and
ADR [0002](../../docs/decisions/0002-tech-stack.md).

## Technical Context

**Language/Version**: TypeScript 5.x throughout (UI, API, shared domain package)

**Primary Dependencies**: React 19 + Vite (SPA), React Router (client routing), TanStack
Query (data fetching/cache), Hono (Worker API), Drizzle ORM (D1 schema + migrations), Zod
(request/response validation), Lucide React (icons, per design system)

**Storage**: Cloudflare D1 (SQLite) for all records; Cloudflare R2 for talent photos

**Testing**: Vitest for unit tests (shared domain package, API handlers via
`@cloudflare/vitest-pool-workers`); Playwright for end-to-end journeys against a local
`wrangler dev` instance

**Target Platform**: Cloudflare Workers (single Worker: static assets + API), custom
domain `greatbritishtalent.online`; evergreen desktop browsers (operators use desktops)

**Project Type**: Web application — SPA + API in one deployable unit

**Performance Goals**: Directory search/filter results visible < 2 s at 5,000 records
(SC-003); typical API reads < 300 ms server-side; find-any-record journey < 10 s (SC-001)

**Constraints**: D1 single-writer limits are acceptable (small operator team, low write
volume); photos ≤ 10 MB upload, stored original + display rendition; no client-side
secrets — all data access behind the Worker; UK formats enforced centrally (FR-013/014)

**Scale/Scope**: ~5,000 talent records, ~10 concurrent operators, 4 screens (directory,
profile view/edit, add talent, topic management) + shared components from the design system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| I | Spec-driven development | Plan derives from approved spec 001; no unspecified features added | ✅ Pass |
| II | Repository is documentation of record | Stack decision recorded as ADR 0002 with alternatives; CHANGELOG + docs updated with this plan | ✅ Pass |
| III | Design-system conformance | Tokens ported verbatim from `design-system/tokens/`; components rebuilt in React matching `.d.ts.txt` props; UI-kit screens are the acceptance bar; Lucide icons; no new colour/spacing values | ✅ Pass |
| IV | One source of truth, multi-brand | `brand` table + `publication` join table from day one; no brand hard-coding; adding a brand is a data insert (FR-011) | ✅ Pass |
| V | Operational, not promotional | `shared/domain` package is the single home of status enums, `TAL-NNNN` rules, GBP/date formatters, fee-band thresholds; UI and API both import it (FR-014) | ✅ Pass |
| VI | Verified before merged | Unit tests exhaustive on shared domain; integration tests on every API endpoint; Playwright covers the five user-story journeys; quickstart.md defines the end-to-end validation run | ✅ Pass |

**Post-design re-check (after Phase 1)**: no design artifact introduces a violation — the
data model keeps brand-dependent state in `publication`, contracts expose domain enums
only from the shared package, and no permanent-delete endpoint exists. ✅ Pass.

*Complexity Tracking is empty — no gate violations to justify.*

## Project Structure

### Documentation (this feature)

```text
specs/001-talent-management/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions + rationale + alternatives
├── data-model.md        # Phase 1 output — entities, fields, transitions
├── quickstart.md        # Phase 1 output — end-to-end validation guide
├── contracts/
│   └── api.md           # Phase 1 output — JSON API contract
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
app/
├── package.json             # Single package; Vite + Wrangler scripts
├── wrangler.jsonc           # Worker config: D1 + R2 bindings, assets, custom domain
├── vite.config.ts
├── drizzle/                 # Generated SQL migrations
├── src/                     # React SPA
│   ├── main.tsx
│   ├── routes/              # directory, profile, add-talent, topics
│   ├── components/          # design-system components rebuilt (Button, Table, Badge…)
│   ├── styles/              # tokens ported from design-system/tokens/ + base styles
│   └── lib/                 # API client, TanStack Query hooks
├── worker/                  # Hono API on the same Worker
│   ├── index.ts             # Worker entry: serve assets + mount /api
│   ├── routes/              # talent, topics, brands, photos, history
│   ├── db/                  # Drizzle schema + query helpers
│   └── middleware/          # Access-identity extraction, error envelope
├── shared/                  # THE domain package (constitution Principle V)
│   ├── enums.ts             # TalentStatus, EnquiryStatus (future), badge-tone map
│   ├── reference.ts         # TAL-NNNN format/parse/validate
│   ├── format.ts            # GBP money, day-month-year dates
│   ├── feeBands.ts          # fixed thresholds + derivation (FR-019)
│   └── schemas.ts           # Zod schemas shared by API validation and UI forms
└── tests/
    ├── unit/                # shared domain (exhaustive) + component tests
    ├── integration/         # API endpoints via vitest-pool-workers
    └── e2e/                 # Playwright: the five user-story journeys
```

**Structure Decision**: one deployable app under `app/`, keeping the repo root for
governance artifacts (`docs/`, `specs/`, `design-system/`). SPA, API, and shared domain
live in a single package with three entry areas (`src/`, `worker/`, `shared/`) — a
monorepo split is deliberately deferred until a second deployable (e.g. a brand website)
actually exists.

## Complexity Tracking

> No constitution violations — table intentionally empty.
