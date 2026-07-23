# Tasks: Profile Enrichment

**Feature**: `013-profile-enrichment` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Tests included (Constitution VI). Paths under `app/`.

## Phase 1 — Setup

- [x] T001 Add `enrichmentSettings` + `talentSiteBio` tables, `brand` brief columns, and
  `talent.source_material` to `app/worker/db/schema.ts`; `npm run db:generate` → rename to
  `app/drizzle/0011_enrichment.sql` (+ journal tag); ensure additive (no CHECK) and seed the
  settings row (id=1, default model, `banned_words='[]'`); apply local. Add `ENRICHMENT_KEK` to
  `.dev.vars`. Record ADR `docs/decisions/0007-ai-enrichment-and-secrets.md`.

## Phase 2 — Foundational

- [x] T002 [P] Create `app/shared/enrichment.ts`: states, `wordCount`, `trigramSimilarity(a,b)`,
  `scanBanned(text,list)`, `buildPrompt({...})` (system+user, British English, grounding, brief,
  word band), model options + default id.
- [x] T003 [P] Unit tests `app/tests/unit/enrichment.test.ts`: similarity (identical→1, disjoint→0,
  partial), banned scan (case-insensitive, phrases), word count, prompt builder (includes grounding
  instruction + British English + banned list + brief), state transitions.
- [x] T004 Create `app/worker/lib/crypto.ts`: AES-GCM `encryptSecret(env, plaintext)` /
  `decryptSecret(env, iv, ciphertext)` using `env.ENRICHMENT_KEK` (base64 key import via WebCrypto).
- [x] T005 [P] Unit test `app/tests/unit/crypto.test.ts`: encrypt→decrypt round-trip; ciphertext ≠
  plaintext; wrong/absent KEK fails cleanly.
- [x] T006 Create `app/worker/lib/anthropic.ts`: `generateBio(env, {model, system, user})` → one
  `fetch` to the Anthropic Messages API (`x-api-key`, `anthropic-version`), returns text; throws a
  typed error on non-2xx. (Consult claude-api reference for exact headers/version.)

## Phase 3 — User Story 1: Settings & key secrecy (P1) 🎯 MVP-of-config

- [x] T007 [US1] `app/worker/services/enrichment.ts` `getSettings` (returns `configured`,`key_hint`,
  `model`,`banned_words`,`house_style` — never the key) + `setSettings` (encrypts api_key when
  present, updates hint; owner-only enforced at route).
- [x] T008 [US1] Routes in `app/worker/routes/enrichment.ts`: `GET/PUT /enrichment/settings`
  (`requirePermission` owner / a settings gate); wire group in `app/worker/index.ts`.
- [x] T009 [P] [US1] Types in `app/src/lib/types.ts`; owner-only `app/src/routes/enrichment-settings.tsx`
  screen + nav entry in `root.tsx`; masked-key display.
- [x] T010 [P] [US1] Integration tests (part 1): set key → GET never returns raw key, only hint;
  non-owner 403; banned_words persist.

**Checkpoint**: The network can be configured; the key is secret.

## Phase 4 — User Story 2: Site editorial brief (P1)

- [x] T011 [US2] Add brief columns handling to the network service/route (extend `updateSite` or add
  `PATCH /network/:id/brief`); include brief in the site read.
- [x] T012 [US2] Add an editorial-brief section to the site dialog in `app/src/routes/network.tsx`
  (audience, tone, word min/max, include, exclude).
- [x] T013 [P] [US2] Integration test (part 2): brief persists and is returned.

## Phase 5 — User Story 3: Generate a grounded bio (P1)

- [x] T014 [US3] Service `generate(reference, brandId, actor)`: guard key+master bio; `buildPrompt`
  from talent facts + site brief + settings; call `anthropic.generateBio`; compute word_count +
  similarity + banned scan; upsert `talent_site_bio` as `draft`; `enrichment_generated` record;
  `502` on model failure (nothing stored). Plus `setSourceMaterial`.
- [x] T015 [US3] Routes: `POST …/enrichment/:brandId/generate`, `PUT …/source-material`,
  `GET …/enrichment` (per-site overview with incomplete flags).
- [x] T016 [US3] Build `app/src/routes/enrichment-tab.tsx`: per-site cards (status, similarity, word
  count, banned-word flags), Generate/Regenerate, source-material editor; wire the real tab in
  `talent-profile.tsx` (replace placeholder).
- [x] T017 [P] [US3] Integration tests (part 3): generation with a stubbed Anthropic fetch stores a
  draft w/ word_count+similarity; `not_configured` w/o key; `no_master_bio`; `generation_failed`
  stores nothing.

**Checkpoint**: Grounded drafts are produced and reviewable.

## Phase 6 — User Story 4: Review, dual-approve, publish (P1)

- [x] T018 [US4] Service `edit` (resets to draft, recomputes), `approve({by})` (admin/talent, ordered
  state machine), `publish` (only from `talent_approved`; sets published_at) — each writes its change
  record; editing an approved bio clears approvals.
- [x] T019 [US4] Routes: `PATCH …/enrichment/:brandId`, `POST …/approve`, `POST …/publish`.
- [x] T020 [US4] Enrichment-tab UI: edit body, Admin approve, record Talent approval (name), Publish;
  disable Publish until `talent_approved`; show approval attribution.
- [x] T021 [P] [US4] Integration tests (part 4): publish refused without both approvals (names the
  missing one); full draft→admin→talent→publish path; edit-after-approve drops to draft.

**Checkpoint**: Nothing goes live without grounded facts + both approvals.

## Phase 7 — User Story 5 + boundary: coverage & publish-safe (P2)

- [x] T022 [US5] `publishSafeBios(talentId)` returns only `{brand_slug, body}` for `published`;
  overview flags sites published-without-approved-bio as incomplete. Confirm `serializeTalent`
  excludes all enrichment data.
- [x] T023 [P] [US5] Integration guard tests (part 5): publish-safe read exposes only published bios;
  no key/drafts/settings in the talent shape or publish-safe read (SC-001/004); each action in
  History attributed (SC-005); add history/dashboard labels for the enrichment actions.

## Phase 8 — Polish & cross-cutting

- [x] T024 [P] e2e `app/tests/e2e/us-enrichment.spec.ts`: owner saves settings (key masked on
  re-read); set a site brief; generate (server stubbed via a test hook/fixture) → draft with
  flags; admin approve + talent approve + publish; coverage shows published vs incomplete.
- [x] T025 [P] Update `CHANGELOG.md` + `docs/case-study.md`; link ADR 0007.
- [x] T026 Full verification on a clean DB (unit + integration + e2e + lint + typecheck); set remote
  `ENRICHMENT_KEK` secret; migrate remote (`0011`) + deploy; visual check.

## Dependencies & execution order

- Setup (T001) → Foundational (T002–T006) block all stories.
- US1 (T007–T010) enables config. US2 (T011–T013) sets briefs. US3 (T014–T017) needs US1's key +
  US2's brief + the anthropic/crypto libs. US4 (T018–T021) needs US3's drafts. US5/boundary
  (T022–T023) needs the write paths. Polish (T024–T026) last.

## Parallel opportunities

- T002 ∥ T003; T004 ∥ T005. T009 ∥ T010 within US1. Integration test tasks T013, T017, T021, T023
  are `[P]` (distinct describe blocks). T024 ∥ T025.

## Implementation strategy

**MVP = Phases 1–2 + US1 + US3**: configure the key + generate a grounded draft. Then US2 (briefs
sharpen output), US4 (approval gate — required before anything is public), US5 (coverage +
publish-safe boundary), Polish. The Anthropic call is isolated in one function and stubbed in all
automated tests, so the suite runs offline and free.
