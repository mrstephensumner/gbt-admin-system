# Implementation Plan: Talent Onboarding System

**Branch**: `010-onboarding-system` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-onboarding-system/spec.md`

## Summary

Replace the Onboarding placeholder tab with a real per-speaker onboarding checklist of seven
fixed steps, a progress summary, and per-step detail. The checklist is the human-readable
surface of the **existing** publish gate — the three publish-required steps (Headshots,
Biography & topics, Fee schedule) map 1:1 to today's `day_rate`/`biography`/`photo` checks, so
both the publish action and the checklist read one shared `publishBlockers()` helper (no
divergent gate). Sensitive compliance steps store attestation status only (operator + timestamp
+ optional note), never raw PII. The Fee schedule step reuses the existing day-rate field as its
standard rate and adds half-day/after-dinner/travel-terms/fees-vary-by-site. All onboarding data
is internal-only and never enters any publish-safe serialization.

## Technical Context

**Language/Version**: TypeScript (ES2022), React 19, Hono on Cloudflare Workers runtime.

**Primary Dependencies**: Hono (API), Drizzle ORM over Cloudflare D1 (SQLite), React Router,
existing shared modules (permissions, formatters, status/vocab enums), Lucide icons.

**Storage**: Cloudflare D1. New table `talent_onboarding_step`; new fee columns on `talent`.
Migration `0008_onboarding.sql`.

**Testing**: Vitest (unit — step definitions, progress maths, `publishBlockers`),
`@cloudflare/vitest-pool-workers` (integration — endpoints, gate parity, permission gating,
publish-safe exclusion, change-record emission), Playwright (e2e — the tab flow).

**Target Platform**: Single Cloudflare Worker serving the React SPA admin + Hono JSON API,
behind Cloudflare Access.

**Project Type**: Web application (SPA + Worker API) — the established app layout under `app/`.

**Performance Goals**: Onboarding read is one indexed query set per speaker; tab renders within
the existing profile-load budget. No new heavy paths.

**Constraints**: Publish-safe boundary (ADR 0003/0004/0005) — no onboarding field in any public
serialization; attestation-only for sensitive PII; fee edits behind `edit_day_rates`.

**Scale/Scope**: Per-speaker (2,244 live records); seven steps each; one new table, four new
`talent` columns, one new tab, three endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven (NON-NEGOTIABLE)**: PASS — spec + clarify done; this plan precedes code;
  tasks follow.
- **II. Repository is documentation of record**: PASS — plan/research/data-model/contracts/
  quickstart committed with the code; CHANGELOG + case-study updated at implementation; no new
  ADR required (this feature operates within ADR 0002/0003 decisions).
- **III. Design-system conformance**: PASS — the tab is rebuilt to match the provided mockup
  using design-system tokens/components (checklist rail, step detail, progress bar, badges);
  no invented values.
- **IV. One source of truth, multi-brand**: PASS — onboarding is per-speaker operational data
  held here; the publish-required steps drive the per-brand publish gate without hard-coding a
  brand. The "fees vary by site" flag carries the multi-brand relationship forward; per-brand
  overrides are explicitly deferred, not faked.
- **V. Operational, not promotional**: PASS — dense, keyboard-friendly checklist; fixed step
  vocabulary and status enum in code. **One documented exception**: travel terms is free text
  (owner decision at clarify) — recorded in the spec; it is internal-only and not used for
  filtering/reporting, so it does not create a status/format data-quality risk.
- **VI. Verified before merged**: PASS — unit/integration/e2e defined below; gate-parity and
  publish-safe exclusion get explicit tests.

**Result**: PASS (no violations; the one fixed-vocabulary exception is owner-approved and
documented). No Complexity Tracking entry required.

## Project Structure

### Documentation (this feature)

```text
specs/010-onboarding-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── onboarding.md    # Phase 1 output — endpoint contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist (done)
└── tasks.md             # /speckit-tasks output (next command)
```

### Source Code (repository root)

```text
app/
├── shared/
│   └── onboarding.ts            # NEW — fixed step definitions, status enum, publishBlockers()
├── drizzle/
│   └── 0008_onboarding.sql      # NEW — talent_onboarding_step table + talent fee columns
├── worker/
│   ├── db/schema.ts             # +talentOnboardingStep table, +fee columns on talent
│   ├── services/
│   │   ├── onboarding.ts        # NEW — read checklist (derived+stored), update step, update fee
│   │   ├── publication.ts       # refactor missing-list to use shared publishBlockers()
│   │   └── serialize.ts         # ensure onboarding/fee-internal fields are admin-only
│   └── routes/
│       └── onboarding.ts        # NEW — GET onboarding, PUT step, PATCH fee-schedule
├── src/
│   ├── routes/
│   │   ├── onboarding-tab.tsx   # NEW — checklist rail + step detail (replaces placeholder)
│   │   └── talent-profile.tsx   # wire real tab in place of coming-soon block
│   └── lib/types.ts             # +onboarding/fee types
└── tests/
    ├── unit/onboarding.test.ts          # step defs, progress maths, publishBlockers
    ├── integration/onboarding.test.ts   # endpoints, gate parity, permission, publish-safe, change records
    └── e2e/us-onboarding.spec.ts        # tab flow: progress, attest a step, fee permission, publish block→pass
```

**Structure Decision**: Extend the existing `app/` web-application layout (SPA + Worker API),
mirroring the module shape used by specs 005–009 (a shared vocab module, a service, a route
group, a profile tab, and the three test tiers). No new architectural surface.

## Phase 0 — Research

See [research.md](research.md). All spec ambiguities were resolved at clarify; research here
records the codebase-integration decisions (gate reconciliation, completion-derivation sources,
change-record actions, storage placement, permission reuse) with rationale and alternatives.

## Phase 1 — Design & Contracts

- [data-model.md](data-model.md) — `talent_onboarding_step` table, new `talent` fee columns,
  the fixed step definitions, status enum, and the derived-vs-stored completion rules.
- [contracts/onboarding.md](contracts/onboarding.md) — `GET /api/talent/:reference/onboarding`,
  `PUT /api/talent/:reference/onboarding/:stepKey`, `PATCH /api/talent/:reference/fee-schedule`,
  including permission gating, error envelopes, and the publish-safe exclusion contract.
- [quickstart.md](quickstart.md) — runnable validation scenarios proving the checklist, the
  gate parity, the permission gate, and the publish-safe exclusion.

### Post-Design Constitution Re-Check

PASS — the design adds no brand hard-coding, keeps one gate source (`publishBlockers`), stores no
raw PII, and keeps onboarding out of publish-safe serialization. Unchanged from the pre-research
gate.
