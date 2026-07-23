# Feature Specification: Internal Talent Notes

**Feature Branch**: `006-talent-notes`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "On the talent profiles, add a section for internal notes
with a simple date stamp and who added the note."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Attributed internal notes on a profile (Priority: P1)

An operator opens a speaker's workspace, writes a short internal note ("Prefers morning
sessions", "Agent asked us to hold fees until September") and saves it. The note appears
at the top of the speaker's Notes tab with the operator's identity and when it was
written. Notes are internal working memory — they never appear anywhere a client or
website could see, and every registered operator can read and add them.

**Independent Test**: Add notes as two different operators; verify order (newest first),
attribution, and timestamps; verify an empty state reads factually; verify note events
appear in the profile's history and activity counts.

**Acceptance Scenarios**:

1. **Given** a speaker's Notes tab, **When** an operator saves a note, **Then** it
   appears first in the list with their email and a day-month-year timestamp.
2. **Given** several notes by different operators, **Then** all are listed newest-first
   with correct attribution.
3. **Given** an empty note or one beyond the length limit, **Then** saving is refused
   with a brief factual message.
4. **Given** a saved note, **Then** the speaker's history records that a note was added
   (attributed), and the profile's activity statistics count it.
5. **Given** an archived speaker, **Then** notes can still be read and added — archiving
   pauses offering, not record-keeping.

### Edge Cases

- Notes by a since-removed operator keep their attribution (spec 002 FR-009).
- Long note lists page rather than truncate silently.
- Notes accept plain multi-line text; no formatting is interpreted.

## Requirements *(mandatory)*

- **FR-001**: Any registered operator MUST be able to add a plain-text note (1–4,000
  characters) to any talent record, including archived ones.
- **FR-002**: Every note MUST permanently record its author and creation time and be
  displayed newest-first with both, in UK formats; note lists MUST paginate.
- **FR-003**: Notes are append-only in this feature — no edit or delete (mirrors the
  audit philosophy; revisit deliberately if operational need appears).
- **FR-004**: Adding a note MUST appear in the talent's change history and activity
  statistics as an attributed event.
- **FR-005**: Notes MUST be internal-only: no import, publication, or future
  website-facing surface may expose them.

## Key Entities

- **Talent note**: body (plain text), author (operator email), created-at; belongs to
  one talent record; append-only.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of notes display correct author and timestamp (verified with two
  distinct operators).
- **SC-002**: An operator can add a note in under 10 seconds from the open workspace.
- **SC-003**: Zero notes reachable through any non-internal surface.

## Assumptions

- Append-only v1 per FR-003 (simplest honest model; matches "simple" request).
- Baseline permission — notes are collaboration, not a gated action.
- Notes tab lives in the workspace tab bar with a live count.
