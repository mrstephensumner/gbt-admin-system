# Feature Specification: Talent Management Module

**Feature Branch**: `001-talent-management`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Core talent/speakers module — the first module of the GBT Admin
System. The bookings team needs to manage the talent roster (speakers first, sister-brand
talent later): create and maintain talent records, find talent quickly in a large roster,
track availability status, and control which talent appear on which brand websites. The
design handoff (design-system/) already defines the screens: Speakers directory, Speaker
profile, and the Talent Management Module view."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add and maintain a talent record (Priority: P1)

A bookings team member adds a new speaker to the roster and keeps their record up to date.
They capture the speaker's name, professional headline, biography, topics, day rate,
location, and contact details, and upload a headshot. The system assigns a permanent
reference (e.g. `SPK-0481`) that the team uses in every conversation about that speaker.
Later, they return to the profile to update the day rate or biography.

**Why this priority**: The talent record is the atom of the whole business — every enquiry,
booking, and invoice ultimately points at one. Nothing else in the admin can exist without
the ability to create and edit talent records, and even alone this replaces the
spreadsheet/legacy back office as the source of truth.

**Independent Test**: Can be fully tested by creating a new talent record, editing each
field, and confirming the saved profile displays the entered data with its assigned
reference — no other module needed.

**Acceptance Scenarios**:

1. **Given** an operator on the talent directory, **When** they choose "Add speaker" and
   save a record with the required fields (name, at least one topic), **Then** the profile
   is created with a unique auto-assigned reference in the format `SPK-NNNN` and appears in
   the directory.
2. **Given** an existing talent profile, **When** the operator edits any field and saves,
   **Then** the change is persisted and visible immediately, and the record shows when it
   was last updated and by whom.
3. **Given** a new record being created, **When** the operator omits a required field,
   **Then** the save is blocked with a brief factual message naming the missing field.
4. **Given** a talent profile without a headshot, **When** it is displayed anywhere in the
   admin, **Then** a placeholder avatar with the talent's initials is shown instead.

---

### User Story 2 - Find talent quickly in a large roster (Priority: P2)

A bookings team member fielding a client call needs to shortlist speakers fast. They open
the talent directory, search by name or reference, and filter by topic, status, and fee
band. The list shows each speaker's headshot, name, reference, topics, day rate, and
status at a glance, with a count like "Showing 8 of 1,284 speakers", and pages through
long result sets.

**Why this priority**: The roster is large (four figures). Once records exist, finding the
right speaker in seconds is the single most frequent daily task and the main measure of
whether the admin beats the old tooling.

**Independent Test**: Seed the directory with a large volume of records and verify search,
each filter, combined filters, result counts, and pagination return correct results —
independent of any other story.

**Acceptance Scenarios**:

1. **Given** a roster of 1,000+ talent records, **When** the operator types part of a name
   or a reference into search, **Then** matching records appear and the result count
   updates to reflect the match ("Showing X of Y speakers").
2. **Given** the directory, **When** the operator applies a topic filter and a status
   filter together, **Then** only records matching both are listed.
3. **Given** a filtered list longer than one page, **When** the operator moves between
   pages, **Then** the filter and search context is preserved.
4. **Given** search terms that match nothing, **When** results are empty, **Then** a brief
   factual empty state is shown with an option to clear filters.

---

### User Story 3 - Track availability status (Priority: P3)

A bookings team member marks a speaker "On hold" while a client decides, "Booked" when an
engagement is agreed, "Confirmed" once contracted, and back to "Available" afterwards. The
status is visible on the directory and the profile as a coloured badge, so the whole team
sees the same picture without asking each other.

**Why this priority**: Status is the team's shared truth about who can be offered to whom.
It prevents double-offering a speaker — the most costly coordination mistake in the
business — but it needs Stories 1–2 to exist first.

**Independent Test**: Change a talent record through each allowed status and verify the
badge updates everywhere the record appears and the change is recorded with time and
operator.

**Acceptance Scenarios**:

1. **Given** any talent record, **When** an operator sets its status, **Then** the only
   choices offered are exactly: Available, On hold, Booked, Confirmed, Cancelled.
2. **Given** a status change, **When** it is saved, **Then** the new status shows
   immediately in the directory row and profile header with its designated badge tone, and
   the record's history notes who changed it and when.
3. **Given** the directory, **When** the operator filters by a status, **Then** only
   records currently in that status are shown.

---

### User Story 4 - Control website publication per brand (Priority: P4)

A bookings team member decides which talent appear on which brand website (Great British
Speakers today; sister brands later). New records start unpublished. Before a record can
be published to a brand, it must be complete enough to represent the brand well — for
example, a day rate, biography, and headshot must be present. Publishing is explicit and
reversible.

**Why this priority**: Publication control is what makes the admin the administration hub
for the websites (the project's larger goal), but it only matters once records exist, are
findable, and carry statuses.

**Independent Test**: Attempt to publish incomplete and complete records to a brand and
verify gating messages, published state per brand, and unpublishing — using the publication
state alone (no live website integration required).

**Acceptance Scenarios**:

1. **Given** a newly created talent record, **When** it is saved, **Then** it is
   unpublished for every brand by default.
2. **Given** a record missing its day rate, **When** an operator attempts to publish it to
   a brand, **Then** publication is blocked with a factual message such as "Add a day rate
   before publishing".
3. **Given** a complete record, **When** an operator publishes it to one brand, **Then**
   the record shows as published for that brand and unpublished for others, and the
   publication state (with who/when) is visible on the profile.
4. **Given** a published record, **When** an operator unpublishes it, **Then** the record
   returns to unpublished for that brand and the change is recorded.

---

### User Story 5 - Archive talent without losing history (Priority: P5)

A bookings team member archives a speaker who has retired or been dropped from the roster.
Archived talent disappear from default directory views and cannot be published or offered,
but their record and history remain viewable so past engagements still make sense.
Archiving is deliberate — the action names the person being archived — and reversible.

**Why this priority**: Rosters churn, so hygiene matters — but only after the core
lifecycle (create, find, status, publish) works.

**Independent Test**: Archive a record and verify it leaves default views, blocks
publication, remains reachable via an "archived" filter, and can be restored intact.

**Acceptance Scenarios**:

1. **Given** an active talent record, **When** an operator archives it, **Then** the
   confirmation names the talent (e.g. "Archive Raj Patel"), and after confirming the
   record leaves the default directory view.
2. **Given** an archived record, **When** an operator views it, **Then** all historical
   data is intact, it is marked archived, and publish actions are unavailable.
3. **Given** an archived record, **When** an operator restores it, **Then** it returns to
   the directory with its previous data (status resets to Available).
4. **Given** any talent record, **Then** no operator-facing action permanently deletes it.

---

### Edge Cases

- Two speakers with identical names: records are always distinguished by their reference
  (`SPK-NNNN`), which is shown alongside the name everywhere.
- Two operators edit the same profile at once: the second save must not silently overwrite
  the first — the later saver is told the record changed and shown what to do.
- A published talent record is archived: it is automatically unpublished from all brands as
  part of archiving, and the operator is told this will happen in the confirmation.
- Photo upload fails or an image is unusable (wrong type, enormous file): the operator gets
  a factual error and the previous photo (or initials placeholder) remains.
- Very long biographies or many topics: profiles and directory rows must remain legible —
  directory rows truncate gracefully; the profile shows full content.
- A brand is added later (new market): existing records simply show as unpublished for the
  new brand; no data migration should be required.
- Roster grows well beyond today's size: the directory must stay responsive at 5,000+
  records (see Success Criteria).
- Day rate of zero or absent: allowed on draft records, blocks publication, and displays as
  "No day rate" rather than "£0".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let operators create a talent record with: full name
  (required), professional headline, biography, one or more topics (at least one required),
  day rate in GBP, location, contact details (email, phone), and one or more photos.
- **FR-002**: The system MUST assign each talent record a unique, immutable reference in
  the format `SPK-NNNN` on creation, never reuse a reference (including after archiving),
  and display it near the talent name wherever the record appears.
- **FR-003**: The system MUST let operators edit every operator-entered field of a talent
  record and persist changes immediately on save.
- **FR-004**: The system MUST record, for every change to a talent record (field edits,
  status changes, publication changes, archive/restore), who made it and when, and make
  this history visible on the record.
- **FR-005**: The system MUST enforce exactly one of the fixed statuses on every talent
  record — Available, On hold, Booked, Confirmed, Cancelled — with new records defaulting
  to Available, and MUST NOT accept any value outside this vocabulary.
- **FR-006**: The system MUST provide a talent directory listing all active records with,
  at minimum: photo (or initials placeholder), name, reference, topics, day rate, and
  status, and MUST show a result count in the form "Showing X of Y speakers".
- **FR-007**: The system MUST let operators search the directory by name (partial matching)
  and by reference, and filter by topic, status, fee band, and archived state, with
  filters combinable and preserved while paging.
- **FR-008**: The system MUST paginate directory results and remain responsive with rosters
  of at least 5,000 records.
- **FR-009**: The system MUST track publication state per talent record per brand, with
  new records unpublished for all brands, and support publishing and unpublishing as
  explicit operator actions.
- **FR-010**: The system MUST block publication of a record that lacks a day rate,
  biography, or photo, telling the operator exactly what is missing in brief factual
  language (e.g. "Add a day rate before publishing").
- **FR-011**: The system MUST support multiple brands from the outset: every
  brand-dependent piece of state names its brand explicitly, and adding a brand later MUST
  NOT require changes to existing talent data.
- **FR-012**: The system MUST let operators archive a talent record (removing it from
  default views, blocking publication and offering) and restore it, and MUST NOT offer any
  permanent-delete action; archive confirmation MUST name the talent and disclose
  auto-unpublication.
- **FR-013**: The system MUST display all money as GBP with the £ symbol and thousands
  separators (e.g. £4,000), all dates as day-month-year (e.g. 12 Aug 2026), and references
  in uppercase monospaced style, consistently everywhere they appear.
- **FR-014**: The system MUST use the fixed status vocabulary, ID formats, and currency/
  date formats through shared definitions so every screen renders them identically.
- **FR-015**: The system MUST validate required fields on save and report omissions with
  brief, factual, sentence-case messages without exclamation marks.
- **FR-016**: The system MUST prevent one operator's save from silently overwriting
  another's concurrent change to the same record, informing the later saver that the
  record has changed.
- **FR-017**: The system MUST restrict all module functionality to authenticated members
  of the bookings team; unauthenticated users can access nothing.

### Key Entities

- **Talent**: A person the business represents (speakers first). Attributes: reference
  (`SPK-NNNN`), name, headline, biography, topics, day rate (GBP), location, contact
  details, photos, status (fixed vocabulary), archived flag, change history. The central
  entity of the whole system; future enquiries and bookings will reference it.
- **Brand**: A market-facing identity of Great British Talent Ltd (initially Great British
  Speakers). Owns publication state; more brands can be added without altering talent data.
- **Publication**: The state of one talent record on one brand — published or not, plus
  who changed it and when. Exists only in combination (talent × brand).
- **Topic**: A subject/category label used to classify and filter talent (e.g. Leadership,
  AI, Sport). Shared vocabulary across the roster; a talent record carries one or more.
- **Change record**: An entry in a talent record's history — what changed, who did it,
  when. Read-only once written.
- **Operator**: An authenticated member of the bookings team using the admin. All
  operators have equal permissions in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can locate any specific talent record in a 1,000+ roster (by
  name fragment or reference) in under 10 seconds.
- **SC-002**: An operator can create a complete, publish-ready talent profile in under
  5 minutes.
- **SC-003**: Directory browsing, searching, and filtering remain responsive — results
  visible in under 2 seconds — with a roster of 5,000 records.
- **SC-004**: 100% of talent records carry a status from the fixed vocabulary and a unique
  reference; zero duplicate references ever occur.
- **SC-005**: Zero incomplete profiles (missing day rate, biography, or photo) can reach a
  published state on any brand.
- **SC-006**: Every change to a talent record is attributable — 100% of edits, status
  changes, publications, and archives show who and when.
- **SC-007**: A new bookings team member can perform the five core journeys (add, find,
  set status, publish, archive) unaided after a single 15-minute walkthrough.

## Assumptions

- **Screens are already designed**: the directory, profile, and talent-module screens in
  `design-system/ui_kits/admin/` and `design-system/Talent Management Module.html` are the
  visual and interaction reference for this feature; this spec defines behaviour, not new
  layouts.
- **Speakers first, talent-shaped data**: the first roster is Great British Speakers, but
  records are modelled as brand-neutral "talent" (per constitution Principle IV) so sister
  brands (presenters, voices) can join without remodelling.
- **Publication is state, not sync**: publishing marks a record as live for a brand within
  the admin. Actual delivery to a live website (feed, API, or rebuild) is a separate
  Horizon-2 feature that will consume this state.
- **Sign-in is provided separately**: a basic authenticated admin session (and the
  Operator identity it supplies) is assumed to exist or be delivered by a separate
  feature; this spec requires it (FR-017) but does not define it.
- **Single permission level**: all bookings team members have full access to this module;
  roles/permissions differentiation is a future feature.
- **No data migration in scope**: importing the existing roster from the current Great
  British Speakers back office is a separate feature; this module starts empty and must
  make manual entry efficient.
- **Enquiries, bookings, and invoicing are out of scope**: they are future modules that
  will reference talent records; nothing in this feature depends on them. The "Booked" and
  "Confirmed" statuses are set manually by operators until the bookings module exists.
- **English-language UI only**, UK conventions throughout, per the constitution's Brand &
  Content Standards.
