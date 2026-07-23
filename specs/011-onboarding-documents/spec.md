# Feature Specification: Talent Documents

**Feature Branch**: `011-onboarding-documents`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "On the representation agreement onboarding step, add the ability to upload the agreement file and make it accessible there and elsewhere in the system." Clarified with the owner: a general documents locker (files may be filed freely or linked to an onboarding step); accessible on the step and in a dedicated Documents section on the profile; version history kept (uploads append, who/when preserved).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - File and retrieve a document (Priority: P1)

An operator opens a speaker's **Documents** section, uploads a file (e.g. the signed
representation agreement), gives it a title, and can download it again later. All of a
speaker's documents — however they were filed — are listed in one place.

**Why this priority**: The core capability. Without it there is nowhere to hold a speaker's
paperwork; with it alone the team can already keep and retrieve documents.

**Independent Test**: Open a speaker, upload a PDF with a title, confirm it appears in the
Documents list, download it, and confirm the bytes match.

**Acceptance Scenarios**:

1. **Given** a speaker, **When** the operator uploads a file with a title, **Then** it appears
   in the Documents section with its title, file name, size, and who/when it was uploaded.
2. **Given** a filed document, **When** the operator downloads it, **Then** the original file
   is returned as an attachment with its correct name and type.
3. **Given** an upload, **When** the file type is unsupported or too large, **Then** it is
   refused with a factual message and nothing is stored.

---

### User Story 2 - Attach the agreement on its onboarding step (Priority: P1)

On the **Representation agreement** onboarding step (and other attestation steps), the operator
can upload the relevant document directly from the step and see it listed there — the same
document also appears in the Documents section.

**Why this priority**: This is the specific request that motivated the feature — the agreement
belongs visibly on its step, next to the attestation.

**Independent Test**: From the Representation agreement step, upload a file; confirm it shows on
the step and also in the Documents section, labelled with that step.

**Acceptance Scenarios**:

1. **Given** an attestation onboarding step, **When** the operator uploads a document from it,
   **Then** the document is linked to that step, shown on the step, and also in the Documents
   section (labelled with the step it belongs to).
2. **Given** a step-linked document, **When** the Documents section is viewed, **Then** the
   document is grouped/labelled under the step so its origin is clear.
3. **Given** a derived step (headshots, biography, fee schedule), **Then** no document-upload
   control is offered on it — those steps are data-driven, not document-driven.

---

### User Story 3 - Keep a version history (Priority: P2)

When a newer copy of a document is uploaded (e.g. a re-signed agreement), it becomes the current
version while previous versions remain accessible, each showing who uploaded it and when.

**Why this priority**: Contracts get re-signed and renewed; keeping the paper trail matters, but
it builds on the basic upload/download of US1.

**Independent Test**: Upload a document, then upload a new version to it; confirm the newest is
shown as current, the earlier version is still downloadable, and each shows its own who/when.

**Acceptance Scenarios**:

1. **Given** an existing document, **When** a new version is uploaded, **Then** it becomes the
   current version and the previous version is retained and still downloadable.
2. **Given** a document with several versions, **When** its history is viewed, **Then** each
   version lists its uploader and upload date, newest first.
3. **Given** the current version, **When** a document is shown in a list, **Then** the current
   version is what downloads by default.

---

### User Story 4 - Remove a document (erasure) (Priority: P2)

An operator can delete a document entirely — all its versions and stored files — for example to
honour a data-erasure request. The deletion is recorded (who/when) even though the files are
gone.

**Why this priority**: Holding personal documents carries a duty to be able to erase them; but
it is a less-frequent action than filing and retrieving.

**Independent Test**: Delete a document; confirm it and all its versions disappear from the
lists, the stored files are removed, and the deletion is recorded in history.

**Acceptance Scenarios**:

1. **Given** a document with versions, **When** the operator deletes it, **Then** every version
   and every stored file is removed and it no longer appears anywhere.
2. **Given** a deletion, **When** history is viewed, **Then** the removal is recorded with the
   acting operator and date (the file contents are not retained).

---

### User Story 5 - Documents are strictly internal and attributed (Priority: P1)

Every document action is attributed and appears in history; and no document — its file, name, or
existence — is ever exposed in any publish-safe or public representation of a speaker.

**Why this priority**: Documents may include confidential contracts and special-category
personal data. The security boundary is as important as the feature itself, so it is top
priority alongside the upload/download core.

**Independent Test**: Confirm the publish-safe shape of a speaker contains no document data;
confirm a download endpoint refuses when not authenticated as a registered operator.

**Acceptance Scenarios**:

1. **Given** any documents on a speaker, **When** the publish-safe/public data for that speaker
   is produced, **Then** it contains no document data of any kind.
2. **Given** a document file, **When** it is requested without a valid registered-operator
   identity, **Then** access is refused.
3. **Given** any upload, version, or deletion, **Then** it is recorded in history, the dashboard
   feed, and activity statistics like other changes.

---

### Edge Cases

- **Unsupported or oversized file**: refused with a factual message; nothing is stored (no
  orphaned file, no record).
- **Upload interrupted after the file is stored but before the record is written**: the system
  must not leave a downloadable file with no record, nor a record with no file.
- **Deleting one version vs the whole document**: this feature deletes the whole document
  (all versions); removing a single interim version is out of scope for v1.
- **A very large number of documents on one speaker**: the Documents section remains legible
  (grouped by step / general, newest versions surfaced).
- **A special-category document (passport, DBS) uploaded to the general locker or an attestation
  step**: permitted, but treated with the same strict access, attribution, and erasure controls
  — the operator remains the data controller for what they choose to store.
- **Download of a superseded version**: still possible from the version history until the whole
  document is deleted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an operator to upload a file against a speaker, with a title,
  storing the file and recording its original name, type, size, uploader and upload time.
- **FR-002**: The system MUST allow a document to be either **general** (filed to the speaker,
  not tied to a step) or **linked to an onboarding attestation step**.
- **FR-003**: The system MUST present all of a speaker's documents in one **Documents** section,
  with step-linked documents labelled by their step, and MUST also show a step's linked
  document(s) on that onboarding step.
- **FR-004**: The system MUST NOT offer document upload on derived onboarding steps (headshots,
  biography, fee schedule).
- **FR-005**: The system MUST allow downloading the current version of a document, returning the
  original file as an attachment with its correct name and type.
- **FR-006**: The system MUST keep a **version history**: uploading a newer file to an existing
  document adds a version, makes it current, and retains prior versions (each with its own
  uploader and date), newest first.
- **FR-007**: The system MUST allow deleting a whole document — removing every version and every
  stored file — and MUST record the deletion (attributed) even though the files are gone.
- **FR-008**: The system MUST validate uploads: an allowed set of document types and a maximum
  size; on failure it refuses with a factual message and stores nothing.
- **FR-009**: The system MUST restrict all document access (upload, list, download, delete) to
  registered operators; document files MUST be served only through an authenticated path, never
  publicly.
- **FR-010**: No document data (file, name, title, existence, uploader) MUST appear in any
  publish-safe or public representation of a speaker.
- **FR-011**: Every document upload, new version, and deletion MUST be attributed (operator +
  timestamp) and surfaced in the History tab, the dashboard activity feed, and activity
  statistics, consistent with existing change types.
- **FR-012**: Storing a file and recording it MUST be consistent — a failure MUST NOT leave a
  stored file without a record or a record without its file.
- **FR-013**: All copy, dates and sizes MUST follow the product's standards (UK English sentence
  case, day-month-year dates, no emoji).

### Key Entities *(include if feature involves data)*

- **Document**: a logical document belonging to a speaker — its title, optional linked onboarding
  step (null = general locker), and who filed it and when. Has one or more versions.
- **Document version**: one uploaded file of a document — the stored file reference, original
  file name, type, size, and who uploaded it and when. The current version is the newest.
- **Change record (existing)**: extended with document actions (uploaded, new version, deleted)
  so they flow into history, the dashboard feed and statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can file a document and download it back intact in under a minute, with
  the downloaded bytes identical to those uploaded.
- **SC-002**: 100% of a speaker's documents — general and step-linked — are findable in the
  single Documents section, with step-linked ones labelled by step.
- **SC-003**: Uploading a new version never loses a prior version: 100% of prior versions remain
  downloadable until the document is deleted.
- **SC-004**: Deleting a document removes 100% of its stored files (no retrievable file remains).
- **SC-005**: Zero document fields appear in any publish-safe/public representation of a speaker
  (verified by inspecting the public data shape).
- **SC-006**: 100% of unauthenticated document-file requests are refused.
- **SC-007**: Every upload, version and deletion is attributable to an operator with a date and
  appears in the History tab.

## Assumptions

- **Scope (CONFIRMED at clarify — general locker)**: documents are a general capability, filed
  freely or linked to an onboarding attestation step; not limited to the representation
  agreement. The representation agreement is simply the first/primary use.
- **Placement (CONFIRMED — step + Documents section)**: step-linked documents show on their step;
  all documents are gathered in a dedicated Documents section on the profile.
- **Versioning (CONFIRMED — keep history)**: uploads append versions; prior versions are retained
  and downloadable; the newest is current.
- **Sensitivity**: because the locker accepts any file (potentially passports, DBS certificates),
  all documents are treated as potentially special-category personal data: strict
  registered-operator-only access, full attribution, and a delete/erasure path. The operator
  remains responsible for what they choose to store; automated retention policies are out of
  scope for v1.
- **Storage**: files are held in the project's object storage, served only through the
  authenticated Worker path (as photos are today), never via a public URL. Documents are kept
  separate from photo storage so they never share a path that the future public site engine
  might expose.
- **Allowed types / size (default, refine in plan)**: common document/image types (PDF, Word,
  plain text, JPEG/PNG) up to a sensible per-file limit (e.g. 25 MB); refined in the plan.
- **Single-version deletion deferred**: v1 deletes whole documents; deleting an individual
  interim version is a later refinement.
- **No new permission (default)**: uploading/downloading/deleting documents is available to any
  registered operator (as notes and onboarding attestation are), attributed. A dedicated
  documents permission can be added later without rework if the team wants to restrict it.
- **Reuses existing systems**: object storage + authenticated file serving (spec 008 photos),
  the change-record/history/dashboard/statistics fabric (spec 004/005/006), the onboarding step
  model (spec 010), and the operator registry gate (spec 002).
