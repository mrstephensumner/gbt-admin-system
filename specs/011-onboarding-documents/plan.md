# Implementation Plan: Talent Documents

**Branch**: `011-onboarding-documents` | **Date**: 2026-07-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-onboarding-documents/spec.md`

## Summary

A per-speaker document store: files filed generally or linked to an onboarding attestation
step, gathered in a **Documents** profile tab and surfaced on their step, with version history,
download, and delete-for-erasure. Files live in a **separate R2 bucket** (`gbt-documents`) from
photos and are served only through the authenticated Worker — never a public URL. Two tables:
`talent_document` (logical doc) and `talent_document_version` (each uploaded file). Every action
is attributed into the change-record fabric; no document data ever enters publish-safe output.

## Technical Context

**Language/Version**: TypeScript (ES2022), React 19, Hono on Cloudflare Workers.

**Primary Dependencies**: Hono, Drizzle over D1, R2 (new `DOCUMENTS` binding), React Router,
existing formatters/enums, Lucide icons, `nanoid` (ids, as photos use).

**Storage**: D1 (`talent_document`, `talent_document_version` — migration `0009_documents.sql`);
R2 bucket `gbt-documents` (binding `DOCUMENTS`) for file bytes.

**Testing**: Vitest (unit — allowed-type/size validation, current-version selection),
`@cloudflare/vitest-pool-workers` (integration — upload/list/download/version/delete, auth gate,
publish-safe exclusion, change records), Playwright (e2e — Documents tab + step upload flow).

**Target Platform**: Single Cloudflare Worker (SPA + API) behind Cloudflare Access.

**Project Type**: Web application (SPA + Worker API), established `app/` layout.

**Performance Goals**: Uploads bounded by the size limit; list is one indexed query set per
speaker; downloads stream from R2.

**Constraints**: Registered-operator-only access (all `/api/*` already gated); files never
public; separate bucket from photos; publish-safe boundary (no document field in public output);
store-then-record consistency (no orphans).

**Scale/Scope**: Per-speaker; two tables; one new R2 bucket; one new profile tab + step controls;
five endpoints (upload, list, download, add-version, delete).

## Constitution Check

*GATE: Must pass before Phase 0. Re-check after Phase 1.*

- **I. Spec-Driven (NON-NEGOTIABLE)**: PASS — spec + clarify done; plan precedes code.
- **II. Repository is documentation of record**: PASS — plan/research/data-model/contracts/
  quickstart committed with code; CHANGELOG + case-study updated at implementation. A short ADR
  records the new bucket + document-storage boundary (ADR 0006) since it is a storage decision.
- **III. Design-system conformance**: PASS — Documents tab + step controls rebuilt with
  design-system tokens/components (upload control, list rows, version history), Lucide icons.
- **IV. One source of truth, multi-brand**: PASS — documents are per-speaker operational data
  held here; no brand hard-coding; never duplicated into a consuming site.
- **V. Operational, not promotional**: PASS — dense, functional list; fixed vocabulary for
  actions; GBP/date/format standards. No fixed-vocabulary exceptions.
- **VI. Verified before merged**: PASS — unit/integration/e2e; auth-gate and publish-safe
  exclusion get explicit tests; store-then-record consistency covered.

**Result**: PASS. One new ADR (0006, R2 document bucket + boundary). No Complexity Tracking entry.

## Project Structure

### Documentation (this feature)

```text
specs/011-onboarding-documents/
├── plan.md · research.md · data-model.md · quickstart.md
├── contracts/documents.md
├── checklists/requirements.md
└── tasks.md   (/speckit-tasks output)
```

### Source Code (repository root)

```text
app/
├── shared/documents.ts                # NEW — allowed types, size limit, helpers (current version)
├── drizzle/0009_documents.sql         # NEW — talent_document + talent_document_version
├── wrangler.jsonc                     # +DOCUMENTS R2 bucket binding
├── worker/
│   ├── db/schema.ts                   # +talentDocument, +talentDocumentVersion
│   ├── services/documents.ts          # NEW — list/upload/addVersion/delete + change records
│   └── routes/documents.ts            # NEW — upload, list, download, add-version, delete
├── src/
│   ├── routes/documents-tab.tsx       # NEW — Documents section (list, upload, versions, delete)
│   ├── routes/onboarding-tab.tsx      # step-linked document control on attestation steps
│   ├── routes/talent-profile.tsx      # +Documents tab
│   └── lib/types.ts                   # +Document/DocumentVersion types
└── tests/
    ├── unit/documents.test.ts
    ├── integration/documents.test.ts
    └── e2e/us-documents.spec.ts
```

**Structure Decision**: Extend the `app/` web app, mirroring the spec 008 photo pipeline
(multipart upload → R2 → authenticated serve → delete) for a new content type, plus the
spec 005–010 tab/service/route/test shape.

## Phase 0 — Research

See [research.md](research.md): separate-bucket decision, store-then-record ordering,
version-model choice (two-table), download/auth approach, allowed types/size, publish-safe.

## Phase 1 — Design & Contracts

- [data-model.md](data-model.md) — the two tables, current-version rule, R2 key scheme.
- [contracts/documents.md](contracts/documents.md) — the five endpoints + auth + publish-safe
  exclusion contract.
- [quickstart.md](quickstart.md) — validation scenarios (file round-trip, versioning, delete,
  auth gate, publish-safe).

### Post-Design Constitution Re-Check

PASS — separate bucket + authenticated serve keep files off any public path; no brand coupling;
no publish-safe leakage; store-then-record ordering prevents orphans. Unchanged from pre-research.
