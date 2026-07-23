# Tasks: Talent Onboarding System

**Feature**: `010-onboarding-system` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Tests are included (Constitution VI — business logic and data operations always get tests;
shared enums/predicates get exhaustive ones). Paths are under `app/`.

## Phase 1 — Setup

- [ ] T001 Add migration `app/drizzle/0008_onboarding.sql`: create `talent_onboarding_step`
  (id, talent_id, step_key, status, note, actor, at) with unique `(talent_id, step_key)` +
  `talent_id` index; ALTER `talent` add `half_day_rate_pence`, `after_dinner_rate_pence`,
  `travel_terms`, `fees_vary_by_site` (default 0), with `>= 0` checks on the pence columns.
- [ ] T002 Reflect the new table + columns in `app/worker/db/schema.ts` (Drizzle
  `talentOnboardingStep` table; add fee columns to the `talent` table definition); apply locally
  (`npm run db:migrate:local`) to confirm the migration is valid.

## Phase 2 — Foundational (blocking prerequisites)

- [ ] T003 [P] Create `app/shared/onboarding.ts`: the seven fixed step definitions (key, title,
  descriptor, order, requiredToPublish, completion kind), the status enum
  (`not_started|in_progress|complete|not_applicable`), and helpers `isAttestationStep`,
  `computeProgress(steps)`.
- [ ] T004 Extract `publishBlockers(talent, photoCount)` into `app/shared/onboarding.ts`
  (returns subset of `['day_rate','biography','photo']`) with the exact current logic; refactor
  `app/worker/services/publication.ts` to call it in place of the inline `missing` array (keep
  `GATE_MESSAGES` and behaviour identical).
- [ ] T005 [P] Unit tests `app/tests/unit/onboarding.test.ts`: step-definition invariants
  (7 steps, stable keys, exactly headshots/biography/fee_schedule required), `computeProgress`
  (including a not-applicable step reducing the applicable total), and `publishBlockers`
  exhaustively (each missing field, all-present, POA day rate).
- [ ] T006 Create `app/worker/services/onboarding.ts` `getOnboarding(d1, reference)`: read the
  talent row + photo count + `talent_onboarding_step` rows, compute derived statuses, merge
  attestation statuses, build `steps[]` (+`blocksPublish`), `progress`, and `fee` per
  [data-model.md](data-model.md).

## Phase 3 — User Story 1: See onboarding progress and work a step (P1) 🎯 MVP

**Goal**: The Onboarding tab renders the checklist with real progress; an operator can select a
step and save attestation steps as draft/complete.

**Independent test**: Open a partly-complete speaker → progress + per-step states render; select
a step → detail shows; attest a step → progress recalculates.

- [ ] T007 [US1] Add `PUT /api/talent/:reference/onboarding/:stepKey` in
  `app/worker/routes/onboarding.ts` (attestation steps only; `bad_step` for derived steps;
  `bad_status` for invalid/NA-on-required; optimistic `version` check) → `updateStep` in
  `app/worker/services/onboarding.ts`; wire the route group in `app/worker/index.ts`.
- [ ] T008 [P] [US1] Add `GET /api/talent/:reference/onboarding` route calling `getOnboarding`.
- [ ] T009 [P] [US1] Add onboarding + fee types to `app/src/lib/types.ts` (OnboardingStep,
  OnboardingProgress, FeeSchedule, OnboardingRead).
- [ ] T010 [US1] Build `app/src/routes/onboarding-tab.tsx`: left checklist rail (progress header
  "X of N complete" + percentage bar, step rows with status circle, current-step highlight,
  publish-blocking red dot) and right step-detail panel (name, "Step X of 7", required-to-publish
  subtitle, status badge); attestation steps get verify/in-progress controls + optional note +
  Save draft / Save & continue footer; derived steps render read-only with a pointer to the
  owning tab. Design-system tokens/Lucide only.
- [ ] T011 [US1] Replace the Onboarding `coming-soon` block in
  `app/src/routes/talent-profile.tsx` with `<OnboardingTab>`; remove the placeholder wiring.
- [ ] T012 [US1] Integration tests `app/tests/integration/onboarding.test.ts` (part 1): GET
  returns correct derived statuses + progress; PUT completes/reverts an attestation step;
  `bad_step` on a derived key; `version_conflict` path.

**Checkpoint**: Onboarding tab is a working tracker on its own.

## Phase 4 — User Story 2: Onboarding gates publishing (P1)

**Goal**: The checklist's blocking flags and the publish action agree, from one source.

**Independent test**: Speaker missing a publish-required step → publish refused naming it +
checklist flags it; complete it → publish succeeds.

- [ ] T013 [US2] Confirm/adjust `publication.publish()` uses `publishBlockers` (from T004) so
  refusal `missing` and the checklist `blocksPublish` derive identically; surface step-linked
  wording where the gate message is shown.
- [ ] T014 [US2] In `onboarding-tab.tsx`, render each incomplete publish-required step as
  visibly blocking, and show a concise "what's blocking publish" summary derived from
  `blocksPublish`.
- [ ] T015 [US2] Handle revert-on-published (FR-017): when reverting a publish-required step (or
  clearing the day rate) on a speaker published to ≥1 brand, disclose the consequence to the
  operator (consistent with archive auto-unpublish disclosure).
- [ ] T016 [P] [US2] Integration tests (part 2): gate parity — for a matrix of missing-field
  combinations, the publish refusal `missing` set equals the checklist `blocksPublish` set;
  publish succeeds once all three complete.

**Checkpoint**: The checklist is the legible face of the publish gate; no divergence.

## Phase 5 — User Story 3: Capture the fee schedule (P2)

**Goal**: Structured fee capture behind `edit_day_rates`, standard rate as a single source.

**Independent test**: With permission → edit four fees + travel terms + toggle, saves, standard
rate matches record; without permission → read-only + `403`.

- [ ] T017 [US3] Add `PATCH /api/talent/:reference/fee-schedule` (requires `edit_day_rates`;
  partial update; `bad_amount` for negatives; optimistic version) → `updateFeeSchedule` in
  `app/worker/services/onboarding.ts`; writes `day_rate_pence` (single source) + new fee columns.
- [ ] T018 [US3] Fee schedule step UI in `onboarding-tab.tsx`: standard/half-day/after-dinner
  rate inputs (GBP `£` formatting, "Excludes VAT" note), free-text travel terms, "fees vary by
  site" toggle with helper text; whole form read-only without `edit_day_rates` (use existing
  `useCan`).
- [ ] T019 [P] [US3] Integration tests (part 3): fee update persists + recomputes fee-step status
  and clears the publish blocker; `403` without `edit_day_rates`; `bad_amount` on negative;
  standard day rate is the same field used by publish/serialize (no duplicate).

**Checkpoint**: Fees captured, permission-gated, gate-linked.

## Phase 6 — User Story 4: Attest sensitive steps without raw PII + publish-safe (P2)

**Goal**: Sensitive steps store attestation only; nothing leaks to publish-safe.

**Independent test**: Attest a sensitive step → status+actor+timestamp(+note) stored, no raw-PII
field exists; publish-safe shape contains no onboarding/fee-internal data.

- [ ] T020 [US4] Support `not_applicable` in `updateStep` (attestation steps only; reject on
  publish-required) and exclude NA steps from `computeProgress` applicable total; UI control to
  mark not-applicable with attribution.
- [ ] T021 [US4] Verify `app/worker/services/serialize.ts` publish-safe fields exclude all
  onboarding + fee-internal fields (half-day/after-dinner/travel-terms/fees-vary + step data);
  adjust if any leak.
- [ ] T022 [P] [US4] Integration guard test (part 4): assert the publish-safe serialization of a
  fully-onboarded speaker contains none of the onboarding/fee-internal keys (SC-004/005); assert
  the data model has no raw passport/bank/DBS field.

**Checkpoint**: Privacy boundary enforced and tested.

## Phase 7 — User Story 5: Attribution & history (P3)

**Goal**: Onboarding changes flow into History, dashboard feed, and statistics.

**Independent test**: Complete then revert a step → both attributed events appear in History and
the dashboard feed.

- [ ] T023 [US5] Emit `change_record` rows from `updateStep`/`updateFeeSchedule`:
  `onboarding_step_completed` / `onboarding_step_reverted` / `onboarding_step_na` / `fee_updated`
  (actor + `field` = step/fee), reusing the existing insert pattern.
- [ ] T024 [P] [US5] Add human-readable labels for the new actions wherever change actions are
  rendered (History tab, dashboard activity feed) so they read as sentences, not codes.
- [ ] T025 [P] [US5] Integration test (part 5): each onboarding/fee change writes an attributed
  change record and appears via the history + dashboard-feed queries.

## Phase 8 — Polish & cross-cutting

- [ ] T026 [P] e2e `app/tests/e2e/us-onboarding.spec.ts`: tab renders with progress; attest a
  step; publish blocked → set day rate → publish passes; fee permission read-only for a
  non-`edit_day_rates` operator; not-applicable excluded from total. (Clean-DB ritual per
  [quickstart.md](quickstart.md); tab selected by exact name.)
- [ ] T027 [P] Update `CHANGELOG.md` (spec 010 entry) and `docs/case-study.md` (timeline entry);
  confirm no new ADR needed (operates within ADR 0002/0003).
- [ ] T028 Full verification on a clean DB: `npm run test:unit && npm run test:integration &&
  npx playwright test tests/e2e/us-onboarding.spec.ts && npm run lint && npm run typecheck`;
  then migrate remote (`0008`) + deploy; visual check vs the mockup.

## Dependencies & execution order

- **Setup (T001–T002)** → **Foundational (T003–T006)** block everything.
- **US1 (T007–T012)** is the MVP and depends only on Foundational.
- **US2 (T013–T016)** depends on T004 (publishBlockers) + US1 UI.
- **US3 (T017–T019)** depends on Foundational + US1 UI shell.
- **US4 (T020–T022)** depends on US1 (updateStep) + serialize.
- **US5 (T023–T025)** depends on the write paths from US1/US3.
- **Polish (T026–T028)** last.

## Parallel opportunities

- T003 ∥ (T005 after T003) during Foundational.
- Within US1: T008, T009 ∥ (both independent of T007's service internals).
- Cross-story integration test tasks T016, T019, T022, T025 are each `[P]` (distinct describe
  blocks in the same test file — coordinate final file assembly).
- Polish T026, T027 ∥.

## Implementation strategy

**MVP = Phase 1 + 2 + Phase 3 (US1)**: a working onboarding checklist with attestation. Ship/
demo, then layer US2 (gate parity), US3 (fees), US4 (privacy), US5 (history), Polish. Each phase
is an independently testable increment.
