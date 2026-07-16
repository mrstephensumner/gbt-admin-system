# Feature Specification: Roster Import from File

**Feature Branch**: `003-roster-import`

**Created**: 2026-07-16 · **Revised**: 2026-07-16 (source changed from website crawl to
file upload per owner; design mockup provided)

**Status**: Draft

**Input**: User description: "Import the existing speaker roster into the GBT Admin
System from an export file provided from the current Great British Speakers back office
(CSV/XLSX/JSON), so the admin becomes the team's day-to-day source of truth without weeks
of manual re-typing. A design mockup of the Export/Import screen was provided (drop-zone
upload, validate-before-import, import modes, recent-transfers history) and is the visual
reference for this feature."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload and validate a roster file into staging (Priority: P1)

An authorised operator drops an export file (CSV, Excel or JSON, up to 25 MB) onto the
import screen. The system **validates first**: it reports how many rows it found, which
map cleanly to candidates, and which rows have problems (missing name, unreadable values,
duplicated identifiers) — before anything is staged. The operator then confirms, and
clean rows become **import candidates** in a staging area. The roster itself is
untouched. Every run appears in a recent-transfers history with who ran it and the
outcome.

**Why this priority**: The roster is ~1,300 strong; re-typing it would take weeks. A
validate-then-stage flow (per the mockup's Validate button) means a malformed file is
caught before it creates anything at all.

**Independent Test**: Upload a known file; the validation report's numbers reconcile
(rows found = clean + problem rows with reasons); confirm; candidates appear with fields
populated; the talent roster is unchanged; the run is listed in history.

**Acceptance Scenarios**:

1. **Given** an export file, **When** the operator uploads it, **Then** a validation
   report shows rows found, rows that map cleanly, and per-row problems — and nothing is
   staged until the operator confirms.
2. **Given** a confirmed validation, **Then** clean rows become candidates capturing:
   the old system's talent identifier, name, headline, biography, topics, day rate,
   location, email, phone, and photo reference — with any missing values recorded as
   gaps on the candidate, not silent omissions.
3. **Given** rows with problems, **When** staging completes, **Then** the clean rows are
   staged anyway and problem rows are listed with reasons — a partial problem never
   voids the run.
4. **Given** an unsupported file type or an oversized file, **Then** the upload is
   refused with a brief factual message and nothing changes.
5. **Given** any completed run, **Then** the recent-transfers history records the file
   name, row counts, who ran it, and when.

---

### User Story 2 - Review and approve candidates into the roster (Priority: P2)

The operator works through staged candidates in a review screen: each shows its captured
fields and photo next to its status and any gaps or duplicate flags. The operator can
tidy a candidate up (fix a name, trim a biography, adjust topics), then approve it —
creating a real talent record with a `TAL-` reference, attributed in history as an
import. Obvious junk can be skipped. Approval works one-by-one or in bulk for a
selection.

**Why this priority**: Human judgement between "what the old system says" and "what
enters the source of truth" is the safety valve — and it must be fast enough to clear
1,300 candidates mostly in bulk.

**Independent Test**: Stage candidates, approve one individually and a batch in bulk;
verify talent records exist with correct fields (including day rate where the file had
one), fresh references, import-attributed history, unpublished state; skip one and
verify it never becomes a record.

**Acceptance Scenarios**:

1. **Given** a staged candidate, **When** the operator approves it, **Then** a talent
   record is created with the candidate's fields (day rate and contact details included
   when present), a fresh `TAL-` reference, topics attached (created inline where new),
   status Available, and unpublished for every brand.
2. **Given** an approved candidate, **Then** the record's history shows it was created
   by import, attributed to the approving operator, and the candidate links to the
   record with status Imported.
3. **Given** a candidate with a mangled field, **When** the operator edits it before
   approving, **Then** the record is created with the corrected value.
4. **Given** fifty selected candidates, **When** the operator approves them in bulk,
   **Then** all fifty records are created and any individual failures are reported
   without blocking the rest.
5. **Given** a skipped candidate, **Then** it leaves the review queue, creates nothing,
   and stays skipped across future uploads.

---

### User Story 3 - Repeat uploads never duplicate (Priority: P3)

Imports get repeated — a corrected export, a newer export, a second brand's file later.
A re-upload recognises what the system has seen: candidates are keyed by the old
system's talent identifier, already-imported and skipped candidates are not re-staged,
and fresh candidates whose names match existing roster records are flagged as possible
duplicates for the reviewer. Records already in the roster are never modified by an
import — once a record is in the admin, the admin's version wins ("add new records
only"; the mockup's update-existing and replace-all modes are explicitly out of scope
for v1).

**Why this priority**: Without idempotence the second file poisons the roster with
duplicates — but it only matters once uploads and approvals (Stories 1–2) exist.

**Independent Test**: Upload the same file twice; candidate count doesn't inflate,
imported/skipped stay untouched, an admin-side edit to an imported record survives the
re-upload, and a name-collision candidate carries a visible duplicate flag.

**Acceptance Scenarios**:

1. **Given** a completed upload and its approvals, **When** the same or an overlapping
   file is uploaded again, **Then** no candidate is staged twice for the same source
   identifier, and Imported/Skipped candidates keep their status; still-New candidates
   are refreshed with the newer file's values.
2. **Given** an imported record later edited in the admin, **When** any file is uploaded
   again, **Then** the record is untouched — imports seed, they never sync.
3. **Given** a new candidate whose name matches an existing active talent record, **Then**
   it is staged with a possible-duplicate flag naming the matching record, for the
   reviewer to decide.
4. **Given** a file whose rows lack a usable source identifier, **Then** those rows land
   in the problem list at validation ("row has no talent identifier") rather than
   becoming unkeyed candidates.

---

### Edge Cases

- Character fidelity: accents, curly quotes, long biographies and pound signs must
  survive the trip intact — no truncation or mangling; spreadsheet quirks (leading
  zeros, dates-as-numbers) must not corrupt values.
- Money interpretation: fee values in the file may be formatted (e.g. "£4,000",
  "4000", "4,000.00") — interpreted conservatively; anything ambiguous becomes a gap for
  the reviewer rather than a silently wrong rate.
- Photo references that don't resolve or aren't images: candidate stages without a photo
  (initials avatar applies after approval) and the gap is noted.
- Two candidates legitimately share a name: both can be approved; references distinguish
  them.
- A staged-but-never-reviewed backlog from an old file: uploading a newer file refreshes
  still-New candidates (Story 3), so reviewers always see the latest values.
- The staging area is discardable: candidates can be cleared and re-uploaded at any time
  without touching the roster; clearing does not reset the Skipped memory.
- Duplicate identifiers within one file: second and later occurrences are problem rows at
  validation, not overwrites.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an authorised operator upload a roster export file
  (CSV, Excel or JSON, up to 25 MB) and MUST validate it before anything is staged,
  producing a reconciling report: rows found = clean rows + problem rows, each problem
  with a row-level reason.
- **FR-002**: Each candidate MUST capture from its row: the source talent identifier
  (required — rows without one are problem rows), name (required), and where present:
  headline, biography, topics, day rate, location, email, phone, and photo reference;
  missing values are recorded as gaps on the candidate.
- **FR-003**: Staging MUST proceed for clean rows even when other rows have problems;
  problem rows MUST be reviewable after the run alongside their reasons.
- **FR-004**: Every upload MUST be recorded in a recent-transfers history: file name,
  counts (found / staged / problems), operator, time, and completion state.
- **FR-005**: Candidates MUST be reviewable in a dedicated screen showing captured
  fields, photo, gaps, duplicate flags, and status (New · Imported · Skipped), filterable
  by status.
- **FR-006**: Operators MUST be able to edit a candidate's fields before approval; edits
  affect only the candidate until approved.
- **FR-007**: Approving a candidate MUST create a talent record through the same rules
  as manual creation (spec 001): fresh `TAL-` reference, at-least-one-topic (topics
  created inline case-insensitively; a candidate with no topics receives one chosen at
  review), status Available, unpublished for every brand, and history attributed to the
  approving operator with an import marker.
- **FR-008**: Bulk approval of selected candidates MUST be supported; individual
  failures within a bulk approval are reported without blocking the others.
- **FR-009**: Skipping a candidate MUST remove it from the review queue permanently,
  including across future uploads; skip memory survives clearing the staging area.
- **FR-010**: Candidates MUST be keyed by their source talent identifier: re-uploads
  refresh still-New candidates with newer values and MUST NOT re-stage or alter Imported
  or Skipped ones; duplicate identifiers within a file are problem rows.
- **FR-011**: Imports MUST never modify existing talent records — including records
  previously created by import and since edited (add-new-only; the mocked
  update-existing and replace-all modes are out of scope for this feature).
- **FR-012**: A New candidate whose name matches an existing active talent record
  (case-insensitively) MUST carry a possible-duplicate flag naming the matching record.
- **FR-013**: All import actions (upload, review, edit, approve, skip, clear) MUST
  require a new permission area under the spec-002 model — default-denied for existing
  operators, held automatically by the Owner.
- **FR-014**: The staging area MUST be clearable by an authorised operator without any
  effect on the talent roster or on skip memory.
- **FR-015**: Monetary values in files MUST be interpreted conservatively (recognised
  formats only); ambiguous values become gaps, never guessed rates.

### Key Entities

- **Import candidate**: One row from an uploaded file, held in staging. Attributes:
  source talent identifier (unique key), captured fields, gaps, possible-duplicate flag,
  status (New · Imported · Skipped), link to the created talent record once imported.
- **Import run (transfer)**: One upload — file name, who ran it, when, counts
  (found / staged / problems), per-row problem reasons, completion state. The
  recent-transfers history is these records, newest first.
- **Talent record** (existing, spec 001): the import's output on approval; never
  modified by later uploads.
- **Permission area** (existing model, spec 002): one new area governing all import
  actions, default-deny.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of rows in an uploaded file are accounted for — every row is either a
  staged candidate or a listed problem with a reason; zero silent losses.
- **SC-002**: A ~1,300-row export validates and stages in under 2 minutes, and an
  operator can clear 100 candidates via bulk approval in under 5 minutes.
- **SC-003**: Uploading the same file twice yields zero duplicate candidates and zero
  duplicate talent records.
- **SC-004**: 100% of imported records are unpublished on arrival and carry attributed
  import history; zero imported records reach a published state without a deliberate
  human publish.
- **SC-005**: An admin-side edit to an imported record survives subsequent uploads
  unchanged.
- **SC-006**: Operators without the import permission can neither upload, review,
  approve, skip, nor clear — verified by direct attempts.
- **SC-007**: Field fidelity: names, biographies and rates in created records match the
  file exactly for a sampled cross-section (accents, punctuation and currency formats
  included).

## Assumptions

- **A file will be provided** (owner-confirmed): an export from the current Great
  British Speakers back office in CSV, Excel or JSON. Exact column layout is unknown
  until a sample file exists — the plan will define a mapping that tolerates common
  layouts, and validation reports make mismatches visible rather than fatal. **A sample
  (or the real) export file is needed before implementation can be verified end-to-end.**
- **Old identifiers are present**: the file carries the old system's talent identifier
  (the mockup matches on "Talent ID"). Old references (e.g. `SPK-…`) are stored on the
  candidate for traceability but new records get fresh `TAL-` references (spec 001
  clarification supersedes the old scheme).
- **Add-new-only in v1**: the mockup's "Update existing & add new" and "Replace all"
  modes, and the entire **Export talent data** panel, are out of scope here — candidates
  for a follow-up spec once the roster is seeded and an update policy is worth designing
  deliberately.
- **Seed, not sync**: after import, the admin is the source of truth; no ongoing
  synchronisation with the old system.
- **Speakers first**: one brand's roster; the same machinery serves sister brands later.
- **Design reference**: the owner-supplied mockup (drop-zone, Validate/Import buttons,
  On-import modes, Recent transfers) guides the screen; it is not yet part of the
  repo's design-system handoff — noted for a future handoff refresh. The mockup also
  reveals future modules (Enquiries, Bookings, Clients, Invoices, Availability,
  Social & News, Profile Enrichment, Statistics, Site Selector, per-site profiles,
  fee schedules) — recorded in the project backlog, all out of scope here.
- **Review is deliberate**: no auto-approval; every record entering the roster passes a
  human decision (individual or explicit bulk selection).
