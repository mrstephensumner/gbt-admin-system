# Implementation Plan: Roster Import from File

**Branch**: `003-roster-import` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-roster-import/spec.md`

## Summary

File-based roster seeding: the SPA parses an uploaded export (CSV/XLSX/JSON) in the
browser into normalised rows; the API validates them (dry-run report), stages clean rows
as import candidates keyed by the old system's talent id, and records every run in a
recent-transfers history. A review screen edits/skips/approves candidates (bulk-chunked);
approval creates talent records through the existing spec-001 creation rules and fetches
the candidate's photo into R2. All import actions sit behind a new `import_roster`
permission area — the first real exercise of spec 002's default-deny extension model.
Decisions in [research.md](research.md); no stack change (ADR 0002 stands).

## Technical Context

**Language/Version**: TypeScript 5.x (extends the existing `app/`)

**Primary Dependencies**: Existing stack + two browser-side parsing libraries (CSV and
XLSX; JSON is native). Parsing runs in the SPA, not the Worker (research R1) — no new
Worker dependencies.

**Storage**: D1 — two new tables (`import_candidate`, `import_run`) via migration; photos
land in the existing R2 bucket at approval time

**Testing**: Vitest unit (column mapping, money parsing, row schema), vitest-pool-workers
integration (validate/stage/approve/skip/idempotence/permission), Playwright e2e (upload
a fixture CSV through the real UI → review → bulk approve → roster populated)

**Target Platform**: Existing Worker at greatbritishtalent.online

**Project Type**: Feature within the existing web application

**Performance Goals**: 1,300-row file validates + stages in < 2 min (SC-002) — staging
inserts are chunked D1 batches; bulk approval chunked at ≤ 25 candidates per request to
stay far inside Worker subrequest limits

**Constraints**: 25 MB client-side file cap; server re-validates every row (browser
parsing is a convenience, not a trust boundary); conservative money parsing (FR-015);
imports never write to existing talent rows (FR-011 — enforced by construction: approval
only ever calls the create path)

**Scale/Scope**: ~1,300 rows typical, tested to 5,000; 1 new screen (Import), 1 new nav
item (permission-gated), ~8 new API endpoints, 1 new permission area

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| I | Spec-driven development | Plan derives from approved (revised) spec 003 | ✅ Pass |
| II | Documentation of record | No stack decision (two UI parsing libs noted in research R1, not architecture); CHANGELOG/docs updated; mockup gap recorded in vision.md | ✅ Pass |
| III | Design-system conformance | Import screen built from existing components (Card, Table, Dialog, Badge, Tabs, Button); drop-zone styled with tokens; owner's mockup is the layout reference | ✅ Pass |
| IV | One source of truth, multi-brand | Import seeds the shared talent table; candidates carry no brand assumptions; machinery reusable for sister-brand files | ✅ Pass |
| V | Operational, not promotional | Column-synonym map, row schema and money parser live in `shared/` (one vocabulary for UI + API); statuses New·Imported·Skipped as shared enum; factual sentence-case messages | ✅ Pass |
| VI | Verified before merged | Fixture files exercised end-to-end (unit → integration → e2e incl. double-upload idempotence and permission refusals); SC-002 timing check | ✅ Pass |

**Post-design re-check (after Phase 1)**: contracts expose no path that mutates existing
talent from import code; candidates table is fully discardable; permission gate covers
every import endpoint. ✅ Pass.

*Complexity Tracking is empty — no gate violations to justify.*

## Project Structure

### Documentation (this feature)

```text
specs/003-roster-import/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R8
├── data-model.md        # Phase 1 — import_candidate, import_run
├── quickstart.md        # Phase 1 — validation guide (uses fixture files)
├── contracts/
│   └── api.md           # Phase 1 — import API
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (additions to existing `app/`)

```text
app/
├── drizzle/0002_import.sql        # import_candidate, import_run tables
├── shared/
│   ├── permissions.ts             # + 'import_roster' area (default-deny extension)
│   └── importing.ts               # column-synonym map, row schema (Zod), money parser,
│                                  #   candidate statuses, normalised-row type
├── worker/
│   ├── services/importing.ts      # validate, stage (idempotent), approve (via spec-001
│   │                              #   create), skip, clear, photo fetch → R2
│   └── routes/importing.ts        # /api/import/* endpoints (all behind import_roster)
├── src/
│   ├── lib/parseRosterFile.ts     # browser-side CSV/XLSX/JSON → normalised rows
│   └── routes/import.tsx          # Import screen: drop-zone, validation report,
│                                  #   candidates review table, bulk approve, transfers
└── tests/
    ├── fixtures/roster-sample.csv # synthetic export matching the mockup's field groups
    ├── unit/importing.test.ts     # mapping, money parsing, row schema
    ├── integration/importing.test.ts
    └── e2e/us-import.spec.ts
```

**Structure Decision**: pure extension — one migration, one shared module, one service,
one route module, one screen. The browser-side parser is the only novel placement
(research R1). The real export file is an outstanding dependency; fixtures stand in and
the column-synonym map (R6) is the adaptation point when it arrives.

## Complexity Tracking

> No constitution violations — table intentionally empty.
