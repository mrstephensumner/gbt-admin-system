# Tasks: Talent Management Module

**Input**: Design documents from `/specs/001-talent-management/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included — constitution Principle VI (Verified Before Merged) mandates
risk-appropriate tests; the spec defines independent test criteria per story.

**Organization**: Grouped by user story so each story is an independently testable
increment. All paths are relative to the repo root; application code lives under `app/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffold, tooling, tokens, CI

- [X] T001 Scaffold `app/` per plan structure: Vite + React + TS project with `src/`, `worker/`, `shared/`, `tests/{unit,integration,e2e}` dirs, `package.json` scripts (dev, build, seed:dev, seed:perf, test:*), and `wrangler.jsonc` with D1 (`gbt_admin`) + R2 (`gbt-photos`) bindings and static assets config
- [X] T002 Install and pin dependencies in `app/package.json`: hono, drizzle-orm + drizzle-kit, zod, @tanstack/react-query, react-router, lucide-react, @fontsource/archivo + public-sans + ibm-plex-mono; dev: vitest, @cloudflare/vitest-pool-workers, @playwright/test, eslint, prettier
- [X] T003 [P] Configure strict TypeScript (`app/tsconfig.json`), ESLint + Prettier (`app/eslint.config.js`, `app/.prettierrc`) with npm scripts `typecheck` and `lint`
- [X] T004 [P] Port design tokens verbatim: copy `design-system/tokens/*.css` to `app/src/styles/tokens/`, replace the Google Fonts `@import` in `fonts.css` with Fontsource imports in `app/src/main.tsx`, create `app/src/styles/index.css` entry mirroring `design-system/styles.css`
- [X] T005 [P] Configure test runners: `app/vitest.config.ts` (unit) + `app/vitest.workers.config.ts` (integration via vitest-pool-workers with D1 migrations applied), `app/playwright.config.ts` (e2e against `wrangler dev`)
- [X] T006 [P] GitHub Actions workflow `.github/workflows/ci.yml`: typecheck + lint + unit + integration on every PR, Playwright e2e on PRs to main, `wrangler deploy` job on main merge (guarded by `CLOUDFLARE_API_TOKEN` secret)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared domain package, database schema, Worker + SPA shells, core components

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Implement `app/shared/enums.ts` — TalentStatus (5 values) with display labels and badge-tone map — plus exhaustive unit tests in `app/tests/unit/enums.test.ts` (FR-005/014)
- [X] T008 [P] Implement `app/shared/reference.ts` — format/parse/validate `TAL-NNNN` (4-digit zero-pad, widens past 9999) — plus unit tests in `app/tests/unit/reference.test.ts` (FR-002)
- [X] T009 [P] Implement `app/shared/format.ts` — GBP money (`£4,000`, "No day rate" for null/0) and day-month-year dates (`12 Aug 2026`) — plus unit tests in `app/tests/unit/format.test.ts` (FR-013)
- [X] T010 [P] Implement `app/shared/feeBands.ts` — fixed thresholds (Under £1k / £1k–£3k / £3k–£5k / £5k–£10k / £10k+), derivation from pence, band → rate-range predicate — plus unit tests in `app/tests/unit/feeBands.test.ts` (FR-019)
- [X] T011 Implement `app/shared/schemas.ts` — Zod schemas for talent create/update, status change, publish/unpublish, archive/restore, topic create/rename/merge, directory query params; factual sentence-case error messages (FR-015)
- [X] T012 Define Drizzle schema in `app/worker/db/schema.ts` for all 8 tables per data-model.md (talent, talent_photo, topic, talent_topic, brand, publication, change_record, ref_counter) with indexes and CHECK constraints; generate initial migration into `app/drizzle/`
- [X] T013 Create seed scripts `app/worker/db/seed.ts` (brand "Great British Speakers", ~20 talent, topics) and 5,000-record perf seed; wire to `npm run seed:dev` / `seed:perf`
- [X] T014 Implement Worker entry `app/worker/index.ts` — Hono app mounting `/api`, static asset serving, error-envelope middleware (`{error:{code,message}}`) in `app/worker/middleware/errors.ts`
- [X] T015 Implement Access identity middleware `app/worker/middleware/identity.ts` — verify Cloudflare Access JWT, expose operator email; dev-mode fake identity injection; `GET /api/me` route in `app/worker/routes/meta.ts` (FR-017, research R5)
- [X] T016 Implement change-history helper `app/worker/db/changeRecords.ts` — same-transaction append-only writes used by every mutation (FR-004, research R9)
- [X] T017 Build SPA shell in `app/src/main.tsx` + `app/src/routes/root.tsx` — React Router setup, TanStack Query client, typed API client in `app/src/lib/api.ts` (version-aware, 409-surface), app layout (dark sidebar + topbar per `design-system/ui_kits/admin/index.html`)
- [X] T018 [P] Rebuild form/action components in `app/src/components/`: Button, IconButton, Input (+FieldLabel/FieldMsg), Textarea, Select, Checkbox, Radio, Switch — props per matching `design-system/components/**/*.d.ts.txt`
- [X] T019 [P] Rebuild display/nav components in `app/src/components/`: Badge, Tag, Avatar (initials fallback), Card, StatCard, Tabs, NavItem, Pagination — props per matching `.d.ts.txt`
- [X] T020 [P] Rebuild data/feedback components in `app/src/components/`: Table (46px rows, UPPERCASE micro-label headers), Dialog, Toast, Tooltip — props per matching `.d.ts.txt`

**Checkpoint**: Foundation ready — user stories can now proceed

---

## Phase 3: User Story 1 — Add and maintain a talent record (P1) 🎯 MVP

**Goal**: Create/edit talent with immutable `TAL-` references, photos, topics-inline,
validation, and visible change history.

**Independent Test**: Create a record, edit every field, verify saved profile shows the
data, its reference, and attributed history — no other story needed.

- [X] T021 [US1] Implement talent service `app/worker/services/talent.ts` — create (transactional ref counter → `TAL-NNNN`, ≥1 topic incl. case-insensitive inline creation, change records) and update (optimistic-lock version check → conflict, field-level old/new change records) (FR-001/002/003/004/016/018)
- [X] T022 [US1] Implement routes in `app/worker/routes/talent.ts`: `POST /api/talent`, `GET /api/talent/:reference`, `PATCH /api/talent/:reference` (409 + current record on stale version), `GET /api/talent/:reference/history` per contracts/api.md
- [X] T023 [US1] Implement photo handling: R2 upload/delete/stream routes in `app/worker/routes/photos.ts` (type/size validation, display rendition, primary auto-reassign) per contracts/api.md
- [X] T024 [US1] Integration tests `app/tests/integration/talent-crud.test.ts` — create (ref format/uniqueness, topic inline dedup), get, patch (incl. 409 path), validation 400s, history contents; photos in `app/tests/integration/photos.test.ts`
- [X] T025 [P] [US1] Build Add-talent screen `app/src/routes/talent-new.tsx` — form with shared-schema validation, inline topic creation, factual error messages
- [X] T026 [P] [US1] Build Profile screen `app/src/routes/talent-profile.tsx` — view/edit fields, photo upload/manage with initials-avatar fallback, history panel (attributed, day-month-year), 409 "record changed while you were editing" flow
- [X] T027 [US1] Playwright journey `app/tests/e2e/us1-add-maintain.spec.ts` — US1 acceptance scenarios 1–4 plus the two-tab concurrency check from quickstart.md

**Checkpoint**: MVP — records can be created, edited, and audited

---

## Phase 4: User Story 2 — Find talent quickly (P2)

**Goal**: Directory with search, combinable filters, count, pagination — responsive at
5,000 records.

**Independent Test**: Seed 5,000 records; verify search/filters/count/pagination
correctness and < 2 s results (SC-003).

- [X] T028 [US2] Implement directory query `app/worker/services/directory.ts` — case-insensitive name/reference search, topic/status/band/archived filters composed as WHERE clauses (band via feeBands predicate), sort, LIMIT/OFFSET + total (FR-006/007/008/019)
- [X] T029 [US2] Implement `GET /api/talent` in `app/worker/routes/talent.ts` per contracts/api.md query params; integration tests `app/tests/integration/directory.test.ts` covering combined filters, no-rate band, pagination totals
- [X] T030 [US2] Build Directory screen `app/src/routes/directory.tsx` — Table rows (photo, name, reference, topics, day rate, status badge), search box, filter controls, "Showing X of Y speakers" count, Pagination with preserved filters, empty state with "Clear filters"
- [X] T031 [US2] Playwright journey `app/tests/e2e/us2-directory.spec.ts` — US2 acceptance scenarios 1–4; separate perf spec `app/tests/e2e/perf-directory.spec.ts` timing search at 5,000 records (SC-003)

**Checkpoint**: Roster is findable at scale

---

## Phase 5: User Story 3 — Track availability status (P3)

**Goal**: Fixed-vocabulary status changes, badge-visible everywhere, attributed.

**Independent Test**: Move a record through each status; badge updates in directory +
profile; history attributes each change.

- [X] T032 [US3] Implement status change in `app/worker/services/talent.ts` + `POST /api/talent/:reference/status` route (vocabulary-only 400, version 409, change record); integration tests `app/tests/integration/status.test.ts` (FR-005)
- [X] T033 [US3] Build status control in `app/src/routes/talent-profile.tsx` (five options only, badge tones per shared enum map) and confirm directory badge + status filter render from the same enum (FR-014)
- [X] T034 [US3] Playwright journey `app/tests/e2e/us3-status.spec.ts` — US3 acceptance scenarios 1–3

**Checkpoint**: Team-wide availability truth works

---

## Phase 6: User Story 4 — Per-brand publication (P4)

**Goal**: Explicit, gated, reversible publication per brand; unpublished by default.

**Independent Test**: Publish incomplete → blocked with named gaps; complete → published
to one brand only with who/when; unpublish reverts.

- [X] T035 [US4] Implement publication service `app/worker/services/publication.ts` — gate checks (day rate, biography, photo, not archived) returning missing list, publish/unpublish with change records; `GET /api/brands` route in `app/worker/routes/brands.ts` (FR-009/010/011)
- [X] T036 [US4] Implement `POST /api/talent/:reference/publish` + `/unpublish` routes per contracts/api.md (422 `incomplete_for_publication` with `missing[]`); integration tests `app/tests/integration/publication.test.ts` incl. every gate and multi-brand isolation
- [X] T037 [US4] Build publication panel in `app/src/routes/talent-profile.tsx` — per-brand publish state with who/when, gating messages verbatim from API ("Add a day rate before publishing")
- [X] T038 [US4] Playwright journey `app/tests/e2e/us4-publication.spec.ts` — US4 acceptance scenarios 1–4

**Checkpoint**: Admin controls website presence per brand

---

## Phase 7: User Story 5 — Archive without losing history (P5)

**Goal**: Soft archive with auto-unpublish disclosure, restore, no delete anywhere.

**Independent Test**: Archive a published record → leaves default views, unpublished,
history intact; restore → back with status Available.

- [X] T039 [US5] Implement archive/restore in `app/worker/services/talent.ts` — archive deletes publications in same transaction, restore resets status to available, both write change records; routes + integration tests `app/tests/integration/archive.test.ts` verifying no DELETE verb exists on talent (FR-012)
- [X] T040 [US5] Build archive UI — confirmation Dialog naming the talent + auto-unpublish disclosure in `app/src/routes/talent-profile.tsx`, archived filter view + restore action in `app/src/routes/directory.tsx`
- [X] T041 [US5] Playwright journey `app/tests/e2e/us5-archive.spec.ts` — US5 acceptance scenarios 1–4

**Checkpoint**: All five spec stories complete

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Topic management (FR-018 central half), visual acceptance, docs, deploy

- [X] T042 Implement topic management routes `app/worker/routes/topics.ts` — list with talent_count, create (idempotent on case-insensitive match), rename (409 on collision), merge (rewrite links + change records + delete source, one transaction); integration tests `app/tests/integration/topics.test.ts` (FR-018)
- [X] T043 Build Topics screen `app/src/routes/topics.tsx` — list with counts, rename and merge flows with confirmation Dialogs
- [X] T044 [P] Visual acceptance pass: compare every screen against `design-system/ui_kits/admin/index.html` and `design-system/Talent Management Module.html` (constitution Principle III bar); fix drift; verify content rules (sentence case, no emoji, mono references, UK formats)
- [X] T045 [P] Full quickstart.md run end-to-end locally (all suites + manual journeys); fix anything that fails; update quickstart.md if commands drifted
- [X] T046 Deploy preview: apply migrations remotely, `wrangler deploy` to workers.dev, smoke-test journeys; document Access setup steps (allow-list, JWT audience) in `docs/deployment.md` — **DONE 16 Jul 2026: live on greatbritishtalent.online behind Cloudflare Access (one-time PIN + Cloudflare login), operator sign-in verified**
- [X] T047 Documentation sync (constitution Principle II): update `README.md` (app section: how to run), `docs/README.md` index, `CHANGELOG.md`; verify docs/decisions still accurate

---

## Dependencies

```text
Phase 1 (Setup) ──▶ Phase 2 (Foundational) ──▶ US1 (P1, MVP)
                                            ├─▶ US2 (P2)  — independent of US1 given seeds
                                            ├─▶ US3 (P3)  — needs US1 profile screen for its UI (T033)
                                            ├─▶ US4 (P4)  — needs US1 profile screen + photos (gates)
                                            └─▶ US5 (P5)  — needs US4 for auto-unpublish test path
Phase 8 (Polish) — after all stories; T042/T043 only need Phase 2 + T021's inline-topic behaviour
```

Story order US1 → US2 → US3 → US4 → US5 is the recommended serial path; after Phase 2,
US2 (T028–T031) can proceed in parallel with US1 since it reads seeded data.

## Parallel Execution Examples

- **Setup**: T003, T004, T005, T006 in parallel after T001–T002.
- **Foundational**: T007–T010 in parallel (independent shared modules); T018, T019, T020
  in parallel after T017.
- **US1**: T025 and T026 in parallel once T021–T023 land.
- **Across stories**: one track on US1 UI (T025–T027) while another builds US2 query/API
  (T028–T029).

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1** (T001–T027): operators can create, edit, and audit
talent records — already a working replacement for spreadsheet tracking. Deliver, then
add stories in priority order, each phase ending with its Playwright journey green and a
CHANGELOG entry. Every merge to main must satisfy constitution Principle VI (all suites
green) and Principle II (docs + changelog in the same commit).
