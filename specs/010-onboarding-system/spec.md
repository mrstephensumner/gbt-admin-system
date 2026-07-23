# Feature Specification: Talent Onboarding System

**Feature Branch**: `010-onboarding-system`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Talent onboarding system — build out the Onboarding profile tab (currently a roadmap placeholder). A per-talent, multi-step onboarding checklist that tracks a speaker's progress through the steps required to represent and publish them, per the design mockup."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See onboarding progress and work a step (Priority: P1)

A bookings-team operator opens a speaker's **Onboarding** tab and sees a checklist of the
steps needed to represent that person: a progress summary ("5 of 7 complete", with a
percentage bar) on the left, and the selected step's detail on the right. They pick a step,
fill in or confirm what it needs, and save — the progress summary updates immediately.

**Why this priority**: This is the core of the feature — a single, legible place to see how
far a speaker is through onboarding and to advance them. Without it there is nothing; with it
alone the team already has a working onboarding tracker.

**Independent Test**: Open a speaker with a partly-completed checklist, confirm the progress
summary and per-step states render, select the current step, change its data, save, and see
the summary recalculate — all without any other story implemented.

**Acceptance Scenarios**:

1. **Given** a speaker with some steps complete, **When** the operator opens the Onboarding
   tab, **Then** the checklist shows each step with its title, descriptor and completion
   state, the "X of 7 complete" count, and a percentage bar derived from those states.
2. **Given** the checklist is open, **When** the operator selects a step, **Then** the right
   panel shows that step's detail with its name, "Step X of 7" position, whether it is
   required to publish, and a status badge.
3. **Given** a step's detail is open, **When** the operator edits its data and chooses "Save
   & continue", **Then** the change is persisted, the progress summary updates, and the next
   step is selected.
4. **Given** a step's detail is open, **When** the operator chooses "Save draft", **Then** the
   partial data is persisted and the step shows as "in progress" without being marked complete.

---

### User Story 2 - Onboarding gates publishing (Priority: P1)

Some steps are marked **required to publish**. A speaker cannot be published to any brand
until every publish-required step is complete. The Onboarding checklist is the single,
human-readable surface that tells the operator exactly what is still blocking publication —
replacing the opaque "record incomplete" message with a precise list.

**Why this priority**: The existing publish gate (spec 001) already blocks incomplete records
but does not explain what is missing. Making onboarding *be* that gate turns a point of
friction into a guided path, and ties the new feature into the system's most important
safeguard. Equal top priority with US1 because the gate must not regress.

**Independent Test**: Take a speaker missing a publish-required step, attempt to publish, and
confirm it is refused with a message naming the incomplete step(s); complete the step, then
confirm publishing succeeds — verifiable against the existing publish action.

**Acceptance Scenarios**:

1. **Given** a speaker with an incomplete publish-required step, **When** an operator attempts
   to publish to any brand, **Then** publication is refused and the reason names the
   incomplete step(s).
2. **Given** the same speaker, **When** the operator views the Onboarding tab, **Then** each
   incomplete publish-required step is visibly flagged as blocking.
3. **Given** all publish-required steps are complete, **When** an operator publishes, **Then**
   publication succeeds (subject to existing per-brand permission).
4. **Given** a published speaker, **When** a publish-required step is later reverted to
   incomplete, **Then** the system discloses that the speaker no longer meets the publish
   requirements (consistent with how archival auto-unpublish is disclosed today).

---

### User Story 3 - Capture the fee schedule (Priority: P2)

The **Fee schedule** step records what the speaker costs: a standard day rate, a half-day
rate, an after-dinner rate, and travel terms, plus a "fees vary by site" flag for brands that
will later set their own rates. The standard day rate is the same figure the rest of the
system already uses; editing any fee is limited to operators who hold the day-rate permission.

**Why this priority**: Fees are the step shown in the mockup and are commercially central, but
they build on US1's step mechanics, so they come after the checklist itself works.

**Independent Test**: As an operator with the day-rate permission, open the Fee schedule step,
enter the four fee fields and travel terms, save, and confirm the standard day rate is the
same value shown elsewhere on the record; as an operator without the permission, confirm the
fee fields are read-only.

**Acceptance Scenarios**:

1. **Given** an operator with the day-rate permission, **When** they save the Fee schedule
   step, **Then** the standard/half-day/after-dinner rates and travel terms persist, and the
   standard day rate matches the value used elsewhere on the record (no duplicate figure).
2. **Given** an operator without the day-rate permission, **When** they open the Fee schedule
   step, **Then** the fee fields are read-only and cannot be saved.
3. **Given** the Fee schedule step, **When** "fees vary by site" is enabled, **Then** the flag
   is recorded for later per-brand fee overrides; the per-brand override mechanism itself is
   out of scope for this feature.
4. **Given** money is displayed, **Then** it uses GBP with the pound sign and thousands
   separators, consistent with the rest of the product.

---

### User Story 4 - Attest sensitive compliance steps without storing raw PII (Priority: P2)

Steps such as **Identity & right to work**, **Bank & payment details** and **Safeguarding &
compliance** concern highly sensitive personal data. The operator records that the check has
been done — who confirmed it and when, plus an optional short internal note — rather than
entering passport numbers, bank account numbers, or DBS certificate contents. None of this
data is ever visible to the public sites.

**Why this priority**: These steps are essential to a lawful representation record, but they
build on the same step mechanics as US1 and carry a specific privacy constraint that must be
designed deliberately, so they follow the core checklist.

**Independent Test**: Open a sensitive step, mark it verified, and confirm the record stores a
verification status with the attesting operator and timestamp and an optional note — and that
no field exists for a raw passport/bank/DBS number; confirm none of the step's data appears in
any publish-safe/public serialization.

**Acceptance Scenarios**:

1. **Given** a sensitive compliance step, **When** an operator marks it verified, **Then** the
   record stores the status, the attesting operator's identity, and the timestamp, and
   optionally a short internal note.
2. **Given** a sensitive compliance step, **Then** there is no field for a raw government ID,
   bank account number, or DBS certificate number.
3. **Given** any onboarding data, **When** publish-safe/public data for a speaker is produced,
   **Then** no onboarding field (status, notes, attesting operator, fee internals) is included.

---

### User Story 5 - Onboarding activity is attributed and visible in history (Priority: P3)

Every meaningful onboarding change — a step completed, reverted, or a fee updated — is
recorded with who did it and when, and appears in the speaker's History tab, the operations
dashboard activity feed, and the statistics that count record activity, exactly like other
changes in the system.

**Why this priority**: Consistency and auditability matter, but the feature delivers value
before the history wiring exists, so this is the final slice.

**Independent Test**: Complete and then revert a step, open the History tab, and confirm both
events appear attributed to the acting operator with day-month-year timestamps; confirm the
same events appear in the dashboard feed.

**Acceptance Scenarios**:

1. **Given** an operator completes a step, **When** they open the History tab, **Then** the
   completion appears, attributed to that operator with a day-month-year timestamp.
2. **Given** an onboarding change occurred, **When** the dashboard activity feed is viewed,
   **Then** the change appears in the feed consistent with other change types.

---

### Edge Cases

- **Steps that derive from existing data**: where a step reflects data captured elsewhere
  (e.g. headshots in the media manager, biography and topics on the profile), completion
  reflects that underlying data rather than being independently ticked — and stays in sync if
  that data later changes (e.g. all headshots removed → the step is no longer complete).
- **Reverting a publish-required step on a published speaker**: the system must disclose the
  consequence rather than silently leaving a published speaker below requirements.
- **A speaker for whom a step does not apply** (e.g. DBS not required for their work): the
  step can be marked not-applicable so it neither blocks publishing nor counts against
  completion, with that choice attributed.
- **Percentage/count with a not-applicable step**: the "X of N complete" summary must remain
  coherent when a step is marked not-applicable.
- **Concurrent edits**: two operators editing the same speaker's onboarding must not silently
  overwrite each other (consistent with the record's existing concurrency handling).
- **A speaker created before this feature existed**: their steps derive/initialise sensibly
  rather than appearing as an error state.
- **"Fees vary by site" enabled but no per-site rates yet**: the standard rates still apply as
  the default; the flag alone changes nothing until the deferred override feature ships.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present, on each speaker's Onboarding tab, a checklist of a fixed
  set of onboarding steps in a defined order, each with a title, a short descriptor, and a
  completion state (not started, in progress, complete, or not applicable).
- **FR-002**: The system MUST derive and display an overall progress summary — the count of
  complete steps out of the applicable total and a corresponding percentage — from the
  individual step states.
- **FR-003**: The system MUST let an operator select a step and view its detail: the step name,
  its position ("Step X of N"), whether it is required to publish, and its current status.
- **FR-004**: The system MUST let an operator save a step's data as a draft (partial, marking
  the step in progress) or as complete (marking the step complete), and MUST reflect either in
  the progress summary immediately.
- **FR-005**: The system MUST designate specific steps as **required to publish**, and MUST
  prevent a speaker from being published to any brand while any applicable publish-required
  step is incomplete.
- **FR-006**: The publish gate MUST be expressed through onboarding-step completion rather than
  duplicating the existing completeness predicate; the existing per-brand publish action MUST
  consult the same source of truth (no divergent second gate).
- **FR-007**: When publication is refused for onboarding reasons, the system MUST state which
  step(s) are incomplete, in operator-facing language.
- **FR-008**: The system MUST visibly flag, within the checklist, any publish-required step
  that is not yet complete.
- **FR-009**: Where a step reflects data owned elsewhere in the system (headshots, biography,
  topics), the system MUST derive that step's completion from the underlying data and keep it
  in sync when that data changes.
- **FR-010**: The Fee schedule step MUST capture a standard day rate, a half-day rate, an
  after-dinner rate, and travel terms (free text), and MUST treat the standard day rate as the
  same value the rest of the system uses for the speaker's day rate (a single source, not a
  copy).
- **FR-010a**: The publish-required steps are exactly Headshots & showreel, Biography & topics,
  and Fee schedule; Representation agreement, Identity & right to work, Bank & payment details,
  and Safeguarding & compliance are tracked but MUST NOT block publishing.
- **FR-011**: Editing any fee value MUST require the existing day-rate permission; operators
  without it MUST see fee fields as read-only.
- **FR-012**: The Fee schedule step MUST record a "fees vary by site" flag; the per-brand fee
  override mechanism itself is explicitly out of scope for this feature.
- **FR-013**: For sensitive compliance steps (identity/right to work, bank/payment,
  safeguarding), the system MUST record only a verification status, the attesting operator, a
  timestamp, and an optional short internal note — and MUST NOT provide storage for raw
  government identifiers, bank account numbers, or DBS certificate contents.
- **FR-014**: No onboarding data of any kind (step statuses, notes, attesting operators, fee
  internals beyond what is already public) MAY be included in any publish-safe or public-facing
  representation of a speaker.
- **FR-015**: The system MUST allow a step to be marked not-applicable where it genuinely does
  not apply to a speaker, excluding it from both the publish gate and the completion total,
  with that choice attributed.
- **FR-016**: Every meaningful onboarding change (step completed, reverted, made
  not-applicable, or fee updated) MUST be recorded with the acting operator and timestamp and
  surfaced in the History tab, the dashboard activity feed, and activity statistics,
  consistent with existing change types.
- **FR-017**: Reverting a publish-required step to incomplete on an already-published speaker
  MUST disclose the consequence to the operator rather than silently leaving the speaker below
  requirements.
- **FR-018**: All copy, money, dates and status vocabulary MUST follow the product's fixed
  standards (UK English sentence case, GBP with `£` and thousands separators, day-month-year
  dates, no emoji).
- **FR-019**: The Onboarding tab MUST replace the existing "In development" placeholder for
  onboarding.
- **FR-020**: Concurrent edits to a speaker's onboarding MUST NOT silently overwrite one
  another, consistent with the record's existing concurrency handling.

### Key Entities *(include if feature involves data)*

- **Onboarding step (definition)**: one of a fixed, ordered set of steps (Representation
  agreement, Identity & right to work, Bank & payment details, Headshots & showreel, Biography
  & topics, Fee schedule, Safeguarding & compliance). Carries a title, descriptor, order,
  whether it is required to publish, and how completion is determined (operator attestation vs
  derived from existing data).
- **Onboarding progress (per speaker, per step)**: the state of a step for a given speaker —
  status (not started / in progress / complete / not applicable), the attesting operator and
  timestamp where relevant, and an optional short internal note for attestation steps.
- **Fee schedule (per speaker)**: standard day rate (shared with the speaker's existing day
  rate), half-day rate, after-dinner rate, travel terms, and the "fees vary by site" flag.
- **Change record (existing)**: extended with onboarding change types so completions,
  reversions, not-applicable decisions and fee updates flow into history, the dashboard feed
  and statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can tell, within five seconds of opening the Onboarding tab, how far
  a speaker is through onboarding and which steps remain — verified by the progress summary and
  per-step states being visible without scrolling on a standard screen.
- **SC-002**: 100% of publish attempts on speakers with an incomplete publish-required step are
  refused with a message that names the incomplete step(s).
- **SC-003**: 100% of speakers who meet all applicable publish-required steps can be published
  (no false blocks), and the onboarding gate and the historical completeness gate never
  disagree.
- **SC-004**: Zero raw government identifiers, bank account numbers, or DBS certificate numbers
  are storable anywhere in the onboarding data model (verified by the absence of such fields).
- **SC-005**: Zero onboarding fields appear in any publish-safe/public representation of a
  speaker (verified by inspection of the public data shape).
- **SC-006**: Editing a fee without the day-rate permission is impossible via the interface and
  is refused if attempted directly (100% of unauthorised attempts refused).
- **SC-007**: Every onboarding change is attributable to an operator with a timestamp and
  appears in the History tab and dashboard feed (100% of changes traced).

## Assumptions

- **Fixed step set (per Constitution Principle V)**: the seven steps and their order are a
  fixed vocabulary defined in code, not an org-configurable list. Configurable onboarding
  templates are out of scope.
- **Which steps block publishing (CONFIRMED at clarify)**: publish-required = **Headshots &
  showreel, Biography & topics, and Fee schedule** only — exactly today's completeness gate
  (name, topics, day rate, at least one photo), now made legible as onboarding steps. The Fee
  schedule blocks on a standard day rate being set, which may be an explicit "POA".
  Representation agreement, Identity & right to work, Bank & payment details, and Safeguarding
  & compliance are **tracked but do NOT block publishing** — they are internal-representation
  and compliance steps that gate booking/payment (handled by later features), not the public
  listing. Consequence: the onboarding gate does not add any new publish requirement over
  today's; it only surfaces the existing one clearly.
- **Completion model per step (CONFIRMED at clarify — hybrid)**: Headshots & showreel and
  Biography & topics derive completion from existing data (media manager; bio + topics fields);
  Fee schedule completes when a standard day rate is set; Representation agreement, Identity,
  Bank, and Safeguarding are manual operator attestations.
- **Standard day rate reuse**: the Fee schedule's standard day rate is the speaker's existing
  day-rate field surfaced in the onboarding step, not a new parallel figure; half-day rate,
  after-dinner rate and travel terms are new fee fields on the record.
- **Travel terms (CONFIRMED at clarify — free text)**: travel terms is a free-text field, to
  accommodate the varied real arrangements agents negotiate. This is a deliberate exception to
  the fixed-vocabulary principle for this one field; it is internal-only (not published) and
  not used for filtering/reporting.
- **Sensitive data**: attestation-only, per the user's explicit steer and ADR 0003/0004/0005;
  raw PII is never stored. This is a firm decision, not a default.
- **Per-site fee overrides deferred**: the "fees vary by site" flag is captured now; the actual
  per-brand override mechanism ships with the Profile Enrichment / multi-tenant engine work.
- **Reuses existing systems**: the per-brand publication model and gate (spec 001/009), the
  change-record fabric and history/dashboard/statistics surfaces (spec 004/005/006), the
  permission model (spec 002), the media manager (spec 008), and record concurrency handling
  are reused, not rebuilt.
- **Design source of truth**: the Onboarding tab is built to match the design-system handoff /
  provided mockup (dark ink chrome, Union Jack accents, Lucide icons, sentence case).
