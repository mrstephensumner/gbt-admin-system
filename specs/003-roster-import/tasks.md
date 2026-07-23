# Tasks: Roster Import from File

**Input**: Design documents from `/specs/003-roster-import/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included — constitution Principle VI; fidelity (SC-007) and idempotence
(SC-003) demand fixture-driven proof.

**Organization**: Grouped by user story. Paths relative to repo root; code in `app/`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational (Blocking Prerequisites)

- [X] T001 [P] Implement `app/shared/importing.ts` — candidate statuses (+labels/tones), NormalisedRow Zod schema (source_id + name required), column-synonym map with `mapHeaders()`, conservative `parseGbpToPence()` — plus exhaustive unit tests in `app/tests/unit/importing.test.ts` (R6/R7, FR-002/015)
- [X] T002 Add `import_candidate` + `import_run` tables to `app/worker/db/schema.ts` per data-model.md; generate migration `app/drizzle/0002_import.sql`; apply locally
- [X] T003 [P] Add `import_roster` to `app/shared/permissions.ts` (label + refusal message) and extend `app/tests/unit/permissions.test.ts` — Team screen toggle appears automatically (R5, FR-013)
- [X] T004 [P] Create synthetic fixture `app/tests/fixtures/roster-sample.csv` matching the mockup's field groups, including awkward rows: missing talent id, "POA" fee, formatted "£4,000" fee, accented names, duplicate id, no-topics row

**Checkpoint**: Vocabulary, schema, fixture ready

---

## Phase 2: User Story 1 — Upload and validate into staging (P1) 🎯

- [X] T005 [US1] Implement staging service in `app/worker/services/importing.ts` — server-side row re-validation, duplicate-in-payload detection, duplicate-of-roster flagging, upsert-by-source_id (refresh `new`, never touch `imported`/`skipped`), run recording incl. dry-run; `POST /api/import/runs` + `GET /api/import/runs` in `app/worker/routes/importing.ts`, wired behind `requirePermission('import_roster')` (FR-001/003/004/010/012)
- [X] T006 [US1] Integration tests `app/tests/integration/importing.test.ts` (part 1) — dry-run writes nothing but records the run; reconciling counts; problem-row reasons; permission 403s on every endpoint; payload caps
- [X] T007 [P] [US1] Implement browser parser `app/src/lib/parseRosterFile.ts` (CSV/XLSX/JSON → NormalisedRow[], 25 MB cap, lazy-loaded libs) and the Import screen upload half in `app/src/routes/import.tsx` — drop-zone, validation report (incl. mapping + problems), Confirm-to-stage, Recent transfers panel; permission-gated nav item in `app/src/routes/root.tsx`

**Checkpoint**: Files land in staging with a reconciling report

---

## Phase 3: User Story 2 — Review and approve (P2)

- [X] T008 [US2] Implement review + approval in service/routes: `GET /api/import/candidates` (status filter, name search, paging), `PATCH /api/import/candidates/:id`, `POST /api/import/candidates/:id/skip`, `POST /api/import/approve` (≤25 ids; per-id results; spec-001 create path; approval-time photo fetch → R2 with graceful failure), `DELETE /api/import/candidates` (news only) (FR-005–FR-009, FR-011, FR-014; R4/R8)
- [X] T009 [US2] Integration tests (part 2) — approval creates via standard rules (fresh ref, unpublished, attributed import history, day rate carried); bulk partial failure; skip permanence incl. across clear; edit-then-approve; not-reviewable 422s; photo-fetch failure → record without photo + gap
- [X] T010 [US2] Build review half of `app/src/routes/import.tsx` — candidates table (status tabs, gaps + duplicate badges, photo preview), edit dialog, skip with confirm, multi-select bulk approve with chunked progress, clear-staging action

**Checkpoint**: Candidates become roster records under human control

---

## Phase 4: User Story 3 — Idempotence proof (P3)

- [X] T011 [US3] Integration tests (part 3) — double-upload: zero duplicate candidates/records, imported/skipped untouched, news refreshed; admin-edited imported record survives re-upload (version/updated_at stable); duplicate flag on name collision; rows without source_id are problems
- [X] T012 [US3] Playwright journey `app/tests/e2e/us-import.spec.ts` — upload fixture through the real UI → validation report → confirm → review → edit one → bulk approve → roster populated → re-upload same file → no duplicates; permission-denied path for a non-granted operator

**Checkpoint**: All three spec stories complete

---

## Phase 5: Polish & Rollout

- [X] T013 Full quickstart run; visual pass of the Import screen against the owner's mockup + design system; SC-002 timing sanity (1,300-row fixture); docs sync — README status, CHANGELOG, note in docs/vision.md backlog already done (Principle II)
- [X] T014 Production rollout — `npm run db:migrate:remote`, deploy, smoke-test permission gate live; **await the real export file** → drop on Validate, extend synonym map if headers differ, then the owner (or grantee) runs the real import — **DEPLOYED 16 Jul 2026: migration 0002 applied remotely, edge + Worker gates verified; live import awaits the real export file**

---

## Dependencies

```text
Phase 1 (T001–T004) ──▶ US1 (T005–T007) ──▶ US2 (T008–T010) ──▶ US3 (T011–T012) ──▶ Polish (T013–T014)
```

Parallel within phases: T001/T003/T004 together; T007 alongside T006; T010 alongside T009.

## Implementation Strategy

US1 alone is a meaningful increment (validated staging). The real export file is the only
external dependency and only blocks the *final* step of T014 — everything else verifies
against the fixture.
