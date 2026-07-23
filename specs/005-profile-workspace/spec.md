# Feature Specification: Talent Profile Workspace

**Feature Branch**: `005-profile-workspace`

**Created**: 2026-07-16

**Status**: Draft

## Clarifications

### Session 2026-07-16 (late — owner decision before the client demo)

- Q: Should unbuilt mockup features appear at all? → A: Yes — as clearly-marked,
  designed "In development" placeholders (owner wants the client to see the platform's
  intended breadth). This supersedes the original FR-005. Placeholders must be
  unmistakably roadmap items (badge + factual description of what's coming), never
  interactive dead-ends. Scope: profile tabs (Onboarding, Availability, Social & News,
  Profile Enrichment) and sidebar modules (Enquiries, Bookings, Clients, Invoices,
  marked "Soon").

**Input**: User description: "Develop the talent tools shown in the profile mockup's tab
bar. Scope agreed for this feature: restructure the talent profile into the mockup's
tabbed workspace and deliver the two tabs backed by data the system already holds —
**Site Selector** (per-brand publication) and **Statistics** (profile activity and
completeness) — plus Photos and History as tabs. Onboarding, Availability, Social & News
and Profile Enrichment are separate future features (recorded in the vision backlog);
their tabs must NOT appear until they exist."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The profile as a tabbed workspace (Priority: P1)

Opening a speaker shows the identity header (photo, name, status, reference, actions) with
a tab bar beneath, per the design mockup: **Profile · Photos · Site selector ·
Statistics · History**. Profile (the edit form) is the default tab. Every existing
capability keeps working exactly as before — editing, photo management, publication,
archive, history — just organised into tabs instead of one long page.

**Why this priority**: The workspace layout is the mockup's shape and the frame every
future tab (availability, onboarding…) slots into. Nothing may regress: all spec-001/002
behaviour and permissions must hold.

**Independent Test**: Walk every existing profile journey (edit, upload photo, publish,
archive, view history) through the tabs; all previous acceptance criteria still pass;
permission gating still hides/disables exactly as before.

**Acceptance Scenarios**:

1. **Given** a speaker profile, **When** it opens, **Then** the header and five tabs are
   shown with Profile active, and switching tabs never loses unsaved-edit warnings'
   correctness (edits live only in the Profile tab).
2. **Given** the Site selector tab, **Then** it is the existing per-brand publication
   panel (states, who/when, publish/unpublish with the same permission gating).
3. **Given** an operator without the publish grant, **Then** the Site selector tab still
   shows publication state read-only, with no action buttons — same rule as before.
4. **Given** the History tab, **Then** the full attributed change history is there.
5. **Given** future modules do not exist yet, **Then** their tabs and menu entries
   render as designed "In development" placeholders that cannot be mistaken for broken
   or working features (revised per clarification).

---

### User Story 2 - Statistics tab (Priority: P2)

The Statistics tab answers "how healthy and active is this profile?" from data the system
already records: a **completeness checklist** (day rate, biography, photo — the
publication essentials, plus headline, location, contact), **activity totals** (changes
all-time and in the last 30 days, split by kind: edits, status changes, publications,
photos), and **profile facts** (created when/by whom, last updated, current status and
how long it's held, topics count, brands published to).

**Why this priority**: Real insight from real data — no invented metrics. Web/traffic
statistics belong to a future feature once a data source exists.

**Independent Test**: Perform a known sequence of actions on a fresh record; verify every
figure on the tab matches the sequence exactly.

**Acceptance Scenarios**:

1. **Given** a record with known history, **Then** activity totals equal the change
   history's actual counts, all-time and last-30-days.
2. **Given** an incomplete profile, **Then** the completeness checklist marks exactly the
   missing items — the same items the publication gate would name.
3. **Given** a record whose status changed 3 days ago, **Then** "current status" shows
   the status and a 3-day duration.

---

### Edge Cases

- Records with very long histories: totals stay exact (counted, not paged).
- Imported records: their import marker appears in history and counts as activity.
- Archived records: workspace opens read-only as before; Statistics still render.
- Deep links to a tab (e.g. shared URL) open with that tab active.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The talent profile MUST present Profile, Photos, Site selector, Statistics
  and History as tabs beneath the identity header, defaulting to Profile, with the active
  tab reflected in the address (deep-linkable).
- **FR-002**: All existing profile capabilities and their permission rules MUST behave
  identically inside the tabs (no regression to any spec-001/002/003 requirement).
- **FR-003**: The Site selector tab MUST present the per-brand publication panel;
  operators without the publish grant see state but no actions.
- **FR-004**: The Statistics tab MUST show: publication-gate completeness (same shared
  definition), extended completeness (headline, location, email or phone), all-time and
  last-30-day activity counts by kind, created/updated facts, current status with
  duration, topics count, and published-brand count — every figure derived from existing
  records.
- **FR-005** (revised per clarification): Unbuilt mockup features MUST appear as
  clearly-marked placeholders — an "In development" badge, a factual one-line purpose,
  and a short planned-capabilities list — with no interactive controls; sidebar entries
  for future modules carry a "Soon" marker. Building any of them remains a future spec.

### Key Entities

None new — presentation over existing data, plus one read-only statistics aggregation.

## Success Criteria *(mandatory)*

- **SC-001**: Zero regressions: the full existing verification suite passes unchanged in
  behaviour (only navigation-path updates in tests).
- **SC-002**: Statistics figures are exact for a scripted action sequence (verified
  automatically).
- **SC-003**: Every tab renders within the existing profile-load feel (no added waits).

## Assumptions

- **Mockup tab names** are adopted where the feature exists ("Site selector"); the
  remaining mockup tabs (Onboarding, Availability, Social & News, Profile Enrichment,
  plus web-traffic Statistics) stay in `docs/vision.md`'s backlog as future specs.
- **Statistics are internal-activity statistics** in this feature; external metrics
  (site traffic, engagement) require data sources that don't exist yet.
