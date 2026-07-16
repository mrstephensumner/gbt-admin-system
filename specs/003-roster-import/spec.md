# Feature Specification: Roster Import from Great British Speakers

**Feature Branch**: `003-roster-import`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Import the existing speaker roster from the current Great
British Speakers website (greatbritishspeakers.co.uk) into the GBT Admin System, so the
admin becomes the team's day-to-day source of truth without weeks of manual re-typing.
The live roster today exists only on the old site; the admin (spec 001) starts empty."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bring the existing roster in as import candidates (Priority: P1)

An authorised operator starts an import run. The system gathers speaker profiles from the
current Great British Speakers website — name, professional headline, biography, topics,
photo, and the source profile page address — into a **staging area** of import candidates.
Nothing touches the live roster yet. When the run finishes, the operator sees a factual
summary: how many profiles were found, how many were fetched cleanly, and which failed
(with the reason), so nothing goes missing silently.

**Why this priority**: The roster is four figures strong; re-typing it would take weeks
and the admin stays a demo until real data lives in it. Candidates-first (rather than
importing straight into the roster) means a messy fetch can be thrown away without
consequence.

**Independent Test**: Run an import against the site (or a captured copy of it), verify
candidates appear in staging with their fields populated and the summary accounts for
every profile found — found = imported-cleanly + failed, with reasons listed.

**Acceptance Scenarios**:

1. **Given** an empty staging area, **When** an operator starts an import run, **Then**
   candidates appear with name, headline, biography, topics, photo, and source address
   captured, and the roster itself is unchanged.
2. **Given** a completed run, **When** the operator views the summary, **Then** it states
   profiles found, candidates staged, and failures with per-profile reasons — the three
   numbers reconcile.
3. **Given** some profile pages fail to fetch, **When** the run completes, **Then** the
   successes are staged anyway and the failures are listed for retry — a partial problem
   never voids the whole run.
4. **Given** an import run in progress, **When** the operator looks at the import screen,
   **Then** they can see progress (profiles processed so far) rather than a frozen page.

---

### User Story 2 - Review and approve candidates into the roster (Priority: P2)

The operator works through staged candidates in a review screen: each shows its captured
fields and photo next to its status. The operator can tidy a candidate up (fix a name,
trim a biography, adjust topics), then approve it — creating a real talent record with a
`TAL-` reference, attributed in history as an import. Obvious junk can be skipped.
Approval works one-by-one or in bulk for a selection.

**Why this priority**: Human judgement between "what the old site says" and "what enters
the source of truth" is the safety valve — but it must be fast enough to clear 1,000+
candidates in bulk.

**Independent Test**: Stage candidates (even hand-created ones), approve one individually
and a batch in bulk; verify talent records exist with correct fields, references, history
attribution, and unpublished state; skip one and verify it never becomes a record.

**Acceptance Scenarios**:

1. **Given** a staged candidate, **When** the operator approves it, **Then** a talent
   record is created with the candidate's fields, a fresh `TAL-` reference, topics
   attached (created inline where new), the photo attached, status Available, and
   unpublished for every brand.
2. **Given** an approved candidate, **Then** the new record's history shows it was
   created by import, attributed to the approving operator, and the candidate's status
   shows Imported with a link to the record.
3. **Given** a candidate with a mangled field, **When** the operator edits it before
   approving, **Then** the record is created with the corrected value.
4. **Given** fifty selected candidates, **When** the operator approves them in bulk,
   **Then** all fifty records are created and the screen reports any that failed
   (e.g. validation) without blocking the rest.
5. **Given** a skipped candidate, **Then** it leaves the review queue, creates nothing,
   and stays skipped across future runs.

---

### User Story 3 - Re-runs never duplicate (Priority: P3)

Imports get re-run — the first run may miss profiles, and the old site stays live for a
while. A re-run recognises what it has seen before: candidates are keyed by their source
page, already-imported and skipped candidates are not re-staged, and fresh candidates
whose names match existing roster records are flagged as possible duplicates for the
reviewer. Records already in the roster are never overwritten by an import — once a
record is in the admin, the admin's version wins.

**Why this priority**: Without idempotence the second run poisons the roster with
duplicates — but it only matters once runs and approvals (Stories 1–2) exist.

**Independent Test**: Run an import twice; verify candidate count doesn't inflate,
imported/skipped stay untouched, an admin-side edit to an imported record survives the
re-run, and a name-collision candidate carries a visible duplicate flag.

**Acceptance Scenarios**:

1. **Given** a completed run and its approvals, **When** the import is re-run, **Then**
   no candidate is staged twice for the same source page and imported/skipped candidates
   keep their status.
2. **Given** an imported record later edited in the admin, **When** the import is re-run,
   **Then** the record is untouched — imports seed, they never sync.
3. **Given** a new candidate whose name matches an existing roster record, **Then** the
   candidate is staged with a possible-duplicate flag naming the matching record, for
   the reviewer to decide.

---

### Edge Cases

- The old site's page structure changes or a page is malformed: affected profiles land in
  the failure list with reasons; the run continues; nothing partial is staged for them.
- Day rates are not published on the old site: imported records arrive without one —
  publication stays blocked (spec 001 FR-010) until an operator adds a rate. The review
  screen makes this expectation clear.
- A photo can't be fetched or is an unsupported format: the candidate stages without a
  photo (initials avatar applies after approval) and the gap is noted on the candidate.
- Very long biographies or unusual characters (accents, quotes) must survive the trip
  intact — no truncation or mangling.
- Two candidates share a name (genuinely different people): both can be approved;
  references distinguish them (spec 001 edge case).
- An import run is interrupted: already-staged candidates keep; the summary marks the run
  as incomplete; re-running finishes the job (Story 3 prevents duplication).
- The staging area is discardable: candidates can be cleared and re-fetched at any time
  without touching the roster.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an authorised operator start an import run that gathers
  speaker profiles from the current Great British Speakers public website into a staging
  area, without modifying the talent roster.
- **FR-002**: Each import candidate MUST capture: name, professional headline (where
  present), biography, topics, photo, and the source page address; missing elements are
  recorded as gaps on the candidate, not silent omissions.
- **FR-003**: Import runs MUST produce a reconciling summary — profiles found, candidates
  staged, failures with per-profile reasons — and partial failures MUST NOT abort the run.
- **FR-004**: Import-run progress MUST be visible while a run is underway.
- **FR-005**: Candidates MUST be reviewable in a dedicated screen showing captured fields,
  photo, gaps, duplicate flags, and status (New · Imported · Skipped · Failed), filterable
  by status.
- **FR-006**: Operators MUST be able to edit a candidate's fields before approval; edits
  affect only the candidate until approved.
- **FR-007**: Approving a candidate MUST create a talent record through the same rules as
  manual creation (spec 001): fresh `TAL-` reference, at-least-one-topic (topics created
  inline case-insensitively), status Available, unpublished for every brand, and history
  attributed to the approving operator with an import marker.
- **FR-008**: Bulk approval of selected candidates MUST be supported; individual failures
  within a bulk approval are reported without blocking the others.
- **FR-009**: Skipping a candidate MUST remove it from the review queue permanently,
  including across re-runs.
- **FR-010**: Candidates MUST be keyed by their source page address: re-runs update
  still-New candidates, and never re-stage or alter Imported or Skipped ones.
- **FR-011**: Imports MUST never modify existing talent records — including records
  previously created by import and since edited (seed, not sync).
- **FR-012**: A New candidate whose name matches an existing active talent record
  (case-insensitively) MUST carry a possible-duplicate flag naming the matching record.
- **FR-013**: Importing (running, editing candidates, approving, skipping, clearing
  staging) MUST require a new permission area under the spec-002 model — default-denied
  for existing operators, held automatically by the Owner.
- **FR-014**: The staging area MUST be clearable by an authorised operator without any
  effect on the talent roster.

### Key Entities

- **Import candidate**: A speaker profile captured from the old site, held in staging.
  Attributes: source page address (unique key), captured fields (name, headline,
  biography, topics, photo), gaps, possible-duplicate flag, status (New · Imported ·
  Skipped · Failed), link to the created talent record once imported. Discardable until
  approved.
- **Import run**: One execution of the gather step — when it ran, who ran it, counts
  (found / staged / failed), per-profile failure reasons, completion state.
- **Talent record** (existing, spec 001): the import's output on approval; created via
  the same rules as manual creation, never modified by later runs.
- **Permission area** (existing model, spec 002): one new area governing all import
  actions, default-deny (spec 002 FR-008).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of the speaker profiles publicly listed on the old site are
  staged as clean candidates in a single run; every remaining profile appears in the
  failure list with a reason — zero silent losses.
- **SC-002**: An operator can review and approve a typical candidate in under 30 seconds,
  and clear 100 candidates via bulk approval in under 5 minutes.
- **SC-003**: Running the import twice in a row yields zero duplicate candidates and zero
  duplicate talent records.
- **SC-004**: 100% of imported records are unpublished on arrival and carry attributed
  import history; zero imported records reach a published state without a human adding
  the missing essentials (day rate) and publishing deliberately.
- **SC-005**: An admin-side edit to an imported record survives subsequent import runs
  unchanged.
- **SC-006**: Operators without the import permission can neither run, review, approve,
  skip, nor clear — verified by direct attempts.

## Assumptions

- **Source is the public website**: candidates are gathered from
  greatbritishspeakers.co.uk's public speaker pages (the same source the design handoff
  drew on). A back-office export (spreadsheet/CSV) is NOT assumed to exist; if one
  surfaces later, file-based import can be a follow-up feature. Day rates and private
  contact details are not on the public site and are expected gaps.
- **One-time seeding, not synchronisation**: the goal is to populate the admin, after
  which the admin is the source of truth. Continuous sync with the old site is
  explicitly out of scope.
- **Speakers brand only**: this import targets the Great British Speakers roster;
  sister-brand imports would reuse the same machinery later.
- **Volume**: the roster is assumed to be in the low thousands (spec 001 was sized for
  5,000); the import must handle that scale within its normal operation.
- **Respectful fetching**: the import reads the company's own public website at a modest
  pace; it does not need to defeat any protection measures — it is the company's own
  content.
- **Review is deliberate**: no auto-approval; every record entering the roster passes a
  human decision (individual or explicit bulk selection).
