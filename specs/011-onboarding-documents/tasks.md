# Tasks: Talent Documents

**Feature**: `011-onboarding-documents` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Tests included (Constitution VI). Paths under `app/`.

## Phase 1 — Setup

- [ ] T001 Add the `DOCUMENTS` R2 bucket binding (`gbt-documents`) to `app/wrangler.jsonc`; run
  `npx wrangler types` to regenerate `Env`. Record ADR `docs/decisions/0006-document-storage.md`
  (separate bucket + never-public boundary).
- [ ] T002 Add `talentDocument` + `talentDocumentVersion` tables to `app/worker/db/schema.ts`;
  `npm run db:generate` → rename to `app/drizzle/0009_documents.sql` (+ journal tag); apply local.

## Phase 2 — Foundational (blocking prerequisites)

- [ ] T003 [P] Create `app/shared/documents.ts`: allowed MIME set, `MAX_DOCUMENT_BYTES` (25 MB),
  `isAllowedType`, `currentVersion(versions)` helper.
- [ ] T004 [P] Unit tests `app/tests/unit/documents.test.ts`: allowed/blocked types, size limit
  boundary, `currentVersion` (picks max version_no, handles single/empty).
- [ ] T005 Create `app/worker/services/documents.ts`: `listDocuments`, `uploadDocument`
  (create doc + version 1), `addVersion`, `versionHistory`, `deleteDocument` — with
  store-then-record ordering and change-record emission per [research.md](research.md).

## Phase 3 — User Story 1: File and retrieve a document (P1) 🎯 MVP

**Goal**: Upload a file with a title to the Documents tab and download it back.

**Independent test**: Upload a PDF, see it listed, download identical bytes.

- [ ] T006 [US1] Add routes in `app/worker/routes/documents.ts`: `POST …/documents` (multipart,
  validate type/size, create), `GET …/documents` (list), `GET …/documents/:versionId/file`
  (authenticated download with attachment headers); wire the group in `app/worker/index.ts`.
- [ ] T007 [P] [US1] Add document types to `app/src/lib/types.ts` (Document, DocumentVersion,
  DocumentsData).
- [ ] T008 [US1] Build `app/src/routes/documents-tab.tsx`: list rows (title, step label or
  "General", file name, size, uploader/date), an upload control (file + title), and per-row
  download; design-system tokens/Lucide only.
- [ ] T009 [US1] Add a **Documents** tab to `app/src/routes/talent-profile.tsx` wiring
  `<DocumentsTab>`.
- [ ] T010 [US1] Integration tests `app/tests/integration/documents.test.ts` (part 1): upload →
  appears in list with metadata; download returns the bytes + attachment headers; unsupported
  type and oversized file refused with nothing stored.

**Checkpoint**: Documents can be filed and retrieved from the profile.

## Phase 4 — User Story 2: Attach on the onboarding step (P1)

**Goal**: Upload/see a step-linked document on its attestation step; it also shows in Documents.

**Independent test**: Upload from the Representation agreement step → shows there and in the tab,
labelled by step; derived steps show no upload control.

- [ ] T011 [US2] Support `step_key` on `POST …/documents` (validate it is an attestation step,
  else `bad_step`); include `step_key` + `step_label` in the list shape.
- [ ] T012 [US2] In `app/src/routes/onboarding-tab.tsx`, add a document control to attestation
  steps only (upload + list this step's documents + download); no control on derived steps.
- [ ] T013 [P] [US2] Integration tests (part 2): a step-linked upload is labelled by step in the
  list and returned for the step; `bad_step` for a derived step key.

**Checkpoint**: The agreement lives on its step and in the Documents tab.

## Phase 5 — User Story 3: Version history (P2)

**Goal**: New uploads append versions; prior versions retained and downloadable.

**Independent test**: Add a version; newest is current, previous still downloadable, each with
its own who/when.

- [ ] T014 [US3] Add `POST …/documents/:documentId/versions` (multipart) and
  `GET …/documents/:documentId/versions` (newest-first history) → service `addVersion` /
  `versionHistory`.
- [ ] T015 [US3] In `documents-tab.tsx` (and the step control), show version count, an "Upload
  new version" action, and an expandable version history with per-version download.
- [ ] T016 [P] [US3] Integration tests (part 3): add-version makes newest current, prior version
  still downloadable, history newest-first with per-version attribution.

**Checkpoint**: Full version trail.

## Phase 6 — User Story 4: Delete / erasure (P2)

**Goal**: Delete a whole document — all versions and files — attributed.

**Independent test**: Delete a document; it and its files disappear; recorded in history.

- [ ] T017 [US4] Add `DELETE …/documents/:documentId` → `deleteDocument` (remove D1 rows then all
  R2 objects; `document_deleted` change record).
- [ ] T018 [US4] Add a delete action in `documents-tab.tsx` with a confirming dialog that names
  the document and states the files will be removed.
- [ ] T019 [P] [US4] Integration tests (part 4): delete removes doc + all versions; the files are
  gone (download 404); a `document_deleted` change record is written.

**Checkpoint**: Erasure works and is recorded.

## Phase 7 — User Story 5: Internal-only + attribution (P1 boundary)

**Goal**: No document data in publish-safe output; downloads require an operator; all attributed.

**Independent test**: Publish-safe shape has no document data; unauthenticated file request
refused; actions in History.

- [ ] T020 [US5] Confirm `app/worker/services/serialize.ts` publish-safe shape excludes all
  document data (no change expected — assert and guard).
- [ ] T021 [P] [US5] Integration guard tests (part 5): publish-safe shape contains no document
  fields (SC-005); a file request without a registered-operator identity is refused (SC-006);
  upload/version/delete each appear in History (SC-007) and describe cleanly.
- [ ] T022 [US5] Add human-readable labels for `document_uploaded` / `document_version_added` /
  `document_deleted` in the History tab and dashboard activity feed.

## Phase 8 — Polish & cross-cutting

- [ ] T023 [P] e2e `app/tests/e2e/us-documents.spec.ts`: Documents tab upload + download; upload
  from the Representation agreement step and see it labelled in the tab; delete with confirm.
  (Clean-DB ritual per [quickstart.md](quickstart.md); tab selected by exact name.)
- [ ] T024 [P] Update `CHANGELOG.md` + `docs/case-study.md`; ensure ADR 0006 is linked.
- [ ] T025 Full verification on a clean DB (unit + integration + e2e + lint + typecheck); create
  the remote `gbt-documents` bucket; migrate remote (`0009`) + deploy; visual check.

## Dependencies & execution order

- Setup (T001–T002) → Foundational (T003–T005) block all stories.
- US1 (T006–T010) is the MVP. US2 (T011–T013) depends on US1's upload path + onboarding tab.
- US3 (T014–T016) and US4 (T017–T019) depend on US1's service/UI. US5 (T020–T022) depends on the
  write paths. Polish (T023–T025) last.

## Parallel opportunities

- T003 ∥ T004 (foundational). T007 ∥ within US1. Integration test tasks T013, T016, T019, T021
  are each `[P]` (distinct describe blocks; coordinate final file assembly). T023 ∥ T024 (polish).

## Implementation strategy

**MVP = Phases 1–2 + US1**: file and retrieve documents from the profile. Then US2 (step
attachment — the original request), US3 (versions), US4 (erasure), US5 (boundary), Polish.
