# Feature Specification: Operations Dashboard

**Feature Branch**: `004-dashboard`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "A dashboard as the admin's landing screen for the client
demo and daily operations: at-a-glance roster KPIs, a live feed of recent team activity,
and 'what needs attention' lists that turn data into next actions. The design handoff's
Dashboard screen (`design-system/ui_kits/admin/`) is the visual reference."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The state of the business at a glance (Priority: P1)

Opening the admin lands on a dashboard of KPI tiles: active speakers, how many are
available right now, how many are on hold / booked / confirmed, how many are published to
each brand website, and the size of the topic vocabulary. Numbers are live — they reflect
the roster as it is at that moment.

**Why this priority**: The landing screen is the product's handshake — for the team every
morning and for the client demo tomorrow. All the data already exists; this story makes
it visible.

**Independent Test**: Seed a known roster; verify every tile equals the equivalent
directory/filter count; change a status and confirm the tiles update on next visit.

**Acceptance Scenarios**:

1. **Given** a roster, **When** an operator opens the admin, **Then** the dashboard is
   the first screen, showing active-speaker count, per-status counts, per-brand published
   counts, and topics count — each matching the directory's own filtered totals.
2. **Given** an empty roster, **Then** tiles read zero gracefully and the dashboard
   points the operator to Add speaker / Import as the way to begin.
3. **Given** a KPI tile, **When** the operator clicks it, **Then** they land on the
   directory pre-filtered to that slice (e.g. On hold → status filter applied).

---

### User Story 2 - What needs attention (Priority: P2)

The dashboard shows two working lists: **Ready to publish** (complete profiles — day
rate, biography, photo — not yet published anywhere) and **Blocked from publishing**
(active profiles missing one or more of those essentials, with the missing items named).
Each row links to the profile so the operator can act.

**Why this priority**: This converts the dashboard from a scoreboard into a to-do list —
the operational value that keeps the team returning. It will also make imported records'
missing day rates visible the moment the real roster arrives.

**Independent Test**: Create profiles in each state; verify each appears in the correct
list with accurate missing-item labels, caps respected, and links landing on the right
profile.

**Acceptance Scenarios**:

1. **Given** an active, complete, unpublished profile, **Then** it appears under Ready to
   publish; publishing it anywhere removes it.
2. **Given** an active profile missing a day rate and photo, **Then** it appears under
   Blocked from publishing listing exactly those gaps ("No day rate · No photo").
3. **Given** more entries than fit, **Then** each list shows the newest few with a count
   of the rest and a link to the filtered directory.
4. **Given** an archived profile, **Then** it appears in neither list.

---

### User Story 3 - Recent activity (Priority: P3)

A feed of the latest changes across the whole roster — who did what to whom, when:
"Raj Patel published to Great British Speakers — hello@… · 16 Jul 2026, 14:20". Entries
link to the profile. The feed reads the existing attributed change history; nothing new
is recorded.

**Why this priority**: Shows the team (and the client) a living system with
accountability built in — and it's pure presentation over spec-001's change records.

**Independent Test**: Perform a series of known actions; verify they appear in order,
correctly described and attributed, linking to the right profiles.

**Acceptance Scenarios**:

1. **Given** recent edits/status changes/publications/imports, **Then** the feed lists
   them newest-first with the speaker's name and reference, a plain-English description,
   the operator, and the time.
2. **Given** a quiet system, **Then** the feed says so factually rather than showing an
   empty block.

---

### Edge Cases

- Large roster (5,000): the dashboard must load as fast as the directory — counts are
  aggregations, not record fetches.
- A brand with zero published speakers still shows its tile (with 0) — absence would read
  as an error.
- Activity by a since-removed operator still shows their email (attribution is permanent,
  spec 002 FR-009).
- The dashboard is read-only — it MUST NOT offer any action its viewer lacks permission
  for elsewhere; its links land on screens that enforce as usual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST be the admin's landing screen for every registered
  operator; the speaker directory moves to its own navigation entry.
- **FR-002**: The dashboard MUST show live counts: active speakers, per-status counts
  (fixed vocabulary), per-brand published counts (every brand shown, zeros included),
  and topics in use; each count MUST equal the equivalent directory/filter total.
- **FR-003**: KPI tiles MUST link to the directory pre-filtered to the corresponding
  slice where one exists.
- **FR-004**: The dashboard MUST list active, unpublished, complete profiles as **Ready
  to publish**, and active profiles missing any of day rate / biography / photo as
  **Blocked from publishing** with the missing items named — capped lists with a
  see-all count.
- **FR-005**: The dashboard MUST show the most recent roster changes (attributed
  operator, plain-English action, speaker name + reference, time) drawn from the
  existing change history, newest first, linking to profiles.
- **FR-006**: All dashboard data MUST be readable by any registered operator (baseline
  permission — it is a read-only view of data they can already see).
- **FR-007**: An empty roster MUST render a purposeful zero state directing the operator
  to Add speaker and Import.

### Key Entities

No new entities — the dashboard aggregates talent, publication, topic, and
change-record data that specs 001–003 already maintain.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every KPI figure matches its directory-filter equivalent exactly (spot-
  checked across all statuses and brands on a seeded roster).
- **SC-002**: The dashboard renders its data in under 2 seconds on a 5,000-record roster.
- **SC-003**: 100% of attention-list rows name the correct missing items, and their links
  land on the right profile.
- **SC-004**: An operator can go from opening the admin to acting on a blocked profile
  (e.g. adding its day rate) in under 30 seconds.

## Assumptions

- **Talent-module scope**: KPIs cover what exists today (roster, publication, topics,
  activity). Tiles for future modules (enquiries, bookings) arrive with those modules —
  the mocked Dashboard's fuller layout remains the north star.
- **Activity = talent change history**: the team-management audit (spec 002) stays on
  the Team screen for the Owner; the dashboard feed is roster activity, visible to all
  operators, consistent with FR-006.
- **No configurability**: one fixed layout for all operators in this feature.
- **"Available right now" means status Available** — the fixed vocabulary is the truth;
  calendar-based availability belongs to a future bookings module.
