# Research: Talent Onboarding System

All user-facing ambiguities were resolved at `/speckit-clarify` (publish-blocking steps = the
three existing; hybrid completion; free-text travel terms). This document records the
**codebase-integration** decisions.

## R1 — Reconciling the onboarding gate with the existing publish gate

- **Decision**: Extract a shared pure helper `publishBlockers(talent, photoCount)` in
  `shared/onboarding.ts` returning the list of unmet publish-required checks
  (`day_rate` / `biography` / `photo`). `publication.publish()` and the onboarding read service
  both call it. The onboarding checklist maps each blocker to its step (Fee schedule / Biography
  & topics / Headshots & showreel).
- **Rationale**: FR-006 demands a single source of truth. Today the predicate lives inline in
  `publication.ts` (`missing` array). Extracting it — without changing its logic — makes the
  checklist and the gate provably identical and keeps the exact existing gate messages.
- **Alternatives considered**: (a) Compute publish-readiness independently in the onboarding
  service — rejected, risks drift (the failure mode FR-006 exists to prevent). (b) Add
  representation agreement as a new blocker — rejected by the owner at clarify (keep today's
  gate; no new public requirement).

## R2 — Completion derivation sources (hybrid model)

- **Decision**: Per-step completion is computed as:
  - **Headshots & showreel** (derived): complete when `talent_photo` count ≥ 1 (matches the
    existing `photo` gate; "min. 3" is descriptor guidance, not a hard rule).
  - **Biography & topics** (derived): complete when `biography` is non-empty (topics are already
    mandatory at record creation, so bio presence is the operative check — matches the existing
    `biography` gate).
  - **Fee schedule** (derived-on-data): complete when a standard day rate is set
    (`day_rate_pence` present, including an explicit POA sentinel).
  - **Representation agreement, Identity & right to work, Bank & payment details, Safeguarding &
    compliance** (attestation): complete when an operator records a verified status; stored in
    `talent_onboarding_step`.
- **Rationale**: Avoids double data-entry and keeps derived steps truthful (they re-derive if
  underlying data changes — FR-009). Attestation steps are the only ones needing stored state.
- **Alternatives considered**: All-manual (rejected at clarify — drift + redundant entry).

## R3 — Storage placement

- **Decision**: (a) New table `talent_onboarding_step (talent_id, step_key, status, note, actor,
  at)` unique on `(talent_id, step_key)` — holds state only for **attestation** steps and any
  **not-applicable** override. Derived steps store no row (status computed on read). (b) New fee
  columns on `talent`: `half_day_rate_pence`, `after_dinner_rate_pence`, `travel_terms` (text),
  `fees_vary_by_site` (boolean). Standard day rate reuses the existing `day_rate_pence`.
- **Rationale**: The fee fields are strictly 1:1 with a talent, so columns are simplest and keep
  the standard rate a single source. A separate step table keeps the sparse attestation/override
  state without bloating the talent row, and lets steps be added later without schema churn.
- **Alternatives considered**: A `talent_fee` side table (unnecessary 1:1 join); a row per step
  per talent for all seven (wasteful — derived steps need no storage).

## R4 — Change-record actions and history/dashboard/statistics wiring

- **Decision**: Reuse the generic `change_record (talent_id, actor, action, field, old_value,
  new_value, at)` with new `action` values: `onboarding_step_completed`,
  `onboarding_step_reverted`, `onboarding_step_na`, and `fee_updated`. History, the dashboard
  activity feed, and statistics already read `change_record` generically, so they pick these up
  with label additions only.
- **Rationale**: Matches the spec 004/005/006 pattern exactly (FR-016); no new history plumbing.
- **Alternatives considered**: A dedicated onboarding audit table — rejected, duplicates the
  existing attribution fabric.

## R5 — Permissions

- **Decision**: Fee edits (`PATCH /fee-schedule`) require the existing `edit_day_rates`
  permission. Attestation-step updates require only a registered operator (no new permission
  area). Reading onboarding requires an authenticated operator (same as the rest of the profile).
- **Rationale**: FR-011 mandates day-rate permission for fees. Onboarding attestation is core
  bookings-team work; adding a permission area for it is unwarranted scope. Owner auto-holds all
  permissions regardless.
- **Alternatives considered**: A new `manage_onboarding` permission — deferred; can be added
  later without rework if the team wants to restrict attestation.

## R6 — Publish-safe boundary

- **Decision**: Onboarding state and fee internals (half-day/after-dinner/travel-terms/fees-vary
  flag, all attestation data) are served only from the admin onboarding endpoints and are absent
  from `serializeTalent`'s publish-safe fields. A guard test asserts no onboarding/fee-internal
  key appears in the publish-safe shape. When the public engine (spec 011+) builds its own
  serializer, this test and the documented boundary constrain it.
- **Rationale**: FR-014 / SC-005 / ADR 0003/0004/0005. The public site engine does not yet
  exist, so the enforceable requirement now is exclusion from the admin's publish-safe shape and
  a standing test.
- **Alternatives considered**: Deferring the guard until the public engine — rejected; cheap to
  assert now and prevents a future leak.

## R7 — Not-applicable semantics

- **Decision**: Only **attestation** steps may be marked not-applicable (e.g. DBS not required).
  A not-applicable step is excluded from both the completion total and the publish gate. Publish-
  required steps (all derived) cannot be N/A. Marking N/A writes `onboarding_step_na` with actor.
- **Rationale**: Keeps the "X of N complete" summary coherent (FR-015) and prevents someone
  N/A-ing a genuine publish requirement.
