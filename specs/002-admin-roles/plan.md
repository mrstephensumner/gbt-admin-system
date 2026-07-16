# Implementation Plan: Admin Roles & Operator Management

**Branch**: `002-admin-roles` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-admin-roles/spec.md`

## Summary

Add the authorization layer on top of the existing Cloudflare Access authentication: an
operator registry in D1 (Owner + operators with permission grants), a per-request
authorization middleware that refuses unregistered identities and enforces four
permission areas (`edit_day_rates`, `publish`, `archive`, `manage_topics`) at the API,
a Team settings screen (Owner-only) for managing operators, and an append-only team
audit trail. No stack changes — this extends the spec-001 application (ADR 0002 stands);
full decision detail in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (unchanged — extends the existing `app/`)

**Primary Dependencies**: Existing stack only (Hono, Drizzle, Zod, React, TanStack
Query); no new dependencies anticipated

**Storage**: Cloudflare D1 — three new tables (`operator`, `operator_grant`,
`operator_audit`) via a new Drizzle migration; no changes to existing tables

**Testing**: Vitest unit tests (shared permissions module), vitest-pool-workers
integration tests (full permission matrix, registry gate, owner invariants), Playwright
e2e (owner manages team; limited operator experiences enforcement)

**Target Platform**: Existing Worker at greatbritishtalent.online (behind Cloudflare
Access)

**Project Type**: Feature within the existing web application

**Performance Goals**: Authorization adds one indexed D1 read per request; keep total
API overhead under ~10 ms so spec-001 targets (SC-003) still hold

**Constraints**: Zero-grace-window enforcement (SC-003 of this spec) forbids caching
operator records across requests; Owner invariant (exactly one) enforced at the service
layer on every mutation path; registry gate must cover **every** existing endpoint

**Scale/Scope**: ~2–10 operators; 1 new screen (Team), 1 new blocked-access screen state,
~6 new API endpoints, middleware touching all existing routes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| I | Spec-driven development | Plan derives from approved spec 002; no unspecified scope | ✅ Pass |
| II | Documentation of record | No new stack decision (ADR 0002 unchanged — noted below); CHANGELOG + docs updated with this plan; migration committed | ✅ Pass |
| III | Design-system conformance | Team screen built from existing rebuilt components (Table, Dialog, Switch, Badge, Card); no new tokens; blocked-access state follows empty-state pattern | ✅ Pass |
| IV | One source of truth, multi-brand | Registry is brand-neutral (operators span brands); permission areas are named capabilities, extensible per future modules without data rewrites (FR-008) | ✅ Pass |
| V | Operational, not promotional | Permission areas defined once in `shared/permissions.ts`, imported by API and UI (no drift); refusal messages factual sentence case via shared constants | ✅ Pass |
| VI | Verified before merged | Full permission matrix integration-tested incl. direct-request bypass attempts; owner-invariant paths tested; e2e journeys for US1–US3; quickstart validation defined | ✅ Pass |

**Stack note (Principle II)**: this feature makes no technology choices — it extends the
stack recorded in [ADR 0002](../../docs/decisions/0002-tech-stack.md). No new ADR needed;
the authorization *pattern* decisions are captured in research.md R1–R8.

**Post-design re-check (after Phase 1)**: data model keeps grants as rows (default-deny
by absence, FR-008); contracts expose no permanent-delete of audit rows; the registry
gate middleware wraps all `/api/*` routes. ✅ Pass.

*Complexity Tracking is empty — no gate violations to justify.*

## Project Structure

### Documentation (this feature)

```text
specs/002-admin-roles/
├── plan.md              # This file
├── research.md          # Phase 0 — authorization decisions R1–R8
├── data-model.md        # Phase 1 — operator, operator_grant, operator_audit
├── quickstart.md        # Phase 1 — validation guide
├── contracts/
│   └── api.md           # Phase 1 — team API + authorization semantics
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (additions to existing `app/`)

```text
app/
├── drizzle/
│   └── 0001_operators.sql        # New migration: operator, operator_grant, operator_audit
├── shared/
│   └── permissions.ts            # Permission areas, labels, refusal messages, can() helper
├── worker/
│   ├── middleware/
│   │   └── authorize.ts          # Registry gate + requirePermission() route guard
│   ├── services/
│   │   └── operators.ts          # Registry CRUD, owner invariant, audit writes, bootstrap
│   └── routes/
│       ├── team.ts               # Owner-only operator management endpoints
│       └── (existing routes)     # Gain requirePermission guards (talent, photos, topics)
├── src/
│   ├── lib/
│   │   └── operator.tsx          # Operator context: /api/me → role/grants for UI gating
│   └── routes/
│       ├── team.tsx              # Team settings screen (Owner only)
│       ├── no-access.tsx         # Blocked-access notice for unregistered identities
│       └── (existing screens)    # Hide/disable controls per grants
└── tests/
    ├── unit/permissions.test.ts
    ├── integration/authorization.test.ts   # Registry gate + full permission matrix
    ├── integration/team.test.ts            # Operator CRUD, owner invariant, audit
    └── e2e/us-roles.spec.ts                # Owner + limited-operator journeys
```

**Structure Decision**: pure extension of the existing single-app layout — a migration,
one shared module, one middleware, one service, one route module, two screens, and
guards threaded through existing routes. `OWNER_EMAIL` is added to `wrangler.jsonc` vars
for the idempotent owner bootstrap (research R4).

## Complexity Tracking

> No constitution violations — table intentionally empty.
