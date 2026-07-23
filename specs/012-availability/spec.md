# Feature Specification: Talent Availability

**Feature Branch**: `012-availability`

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description + design mockup: an Availability tab per speaker — a month calendar of dated availability entries (available, pencilled, confirmed, blocked), a "This month" list, a default-working-week setting, and a (deferred) Google Calendar connect.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a speaker's month at a glance (Priority: P1)

An operator opens a speaker's **Availability** tab and sees a month calendar. Days with entries
are coloured and labelled by state — **available** (green), **pencilled** (yellow), **confirmed**
(blue), **blocked** (red) — and a legend explains the colours. They can page to the previous or
next month.

**Why this priority**: The calendar is the feature. Without it there is nothing; with it the team
can already read a speaker's diary.

**Independent Test**: Open a speaker with a few entries in a month, confirm each entry's day shows
the right colour/label, the legend is present, and prev/next changes the month.

**Acceptance Scenarios**:

1. **Given** a speaker with entries this month, **When** the tab opens, **Then** each entry's
   day(s) show the state colour and label, and days without entries are unmarked.
2. **Given** the calendar, **When** the operator clicks Prev/Next, **Then** the grid moves to the
   adjacent month and shows that month's entries.
3. **Given** an entry spanning several days, **When** it is shown, **Then** every day in its range
   carries the state.

---

### User Story 2 - Block dates and record engagements (Priority: P1)

An operator can add an availability entry: choose a state, a title, an optional detail and
location, and a date (or date range). A **Block dates** action quickly marks a speaker
unavailable (e.g. "Annual leave"). Existing entries can be edited or removed.

**Why this priority**: A read-only calendar is not enough — the team maintains the diary by hand
(holds and bookings will later flow from other modules, but manual entry is the foundation).

**Independent Test**: Add a blocked range and a confirmed engagement, confirm they appear on the
calendar and the list; edit one and remove the other.

**Acceptance Scenarios**:

1. **Given** the tab, **When** the operator uses "Block dates" for a date range, **Then** a
   blocked entry is created across that range and shown in red.
2. **Given** a day, **When** the operator adds an entry with a state, title, detail, location and
   date range, **Then** it is created and appears on the calendar and in the list.
3. **Given** an existing entry, **When** the operator edits its details or state, **Then** the
   change is reflected everywhere it appears.
4. **Given** an existing entry, **When** the operator removes it, **Then** it disappears from the
   calendar and list.
5. **Given** an invalid range (end before start), **When** saving, **Then** it is refused with a
   factual message.

---

### User Story 3 - Read this month's commitments as a list (Priority: P2)

Alongside the calendar, a **This month** panel lists the visible month's entries in date order —
each showing its date, title, detail · location, and a state badge — so the team can scan
commitments without decoding the grid.

**Why this priority**: A useful companion to the grid, but the grid delivers value first.

**Independent Test**: With several entries in a month, confirm the list shows them in date order
with the correct badges, and updates when the month changes.

**Acceptance Scenarios**:

1. **Given** entries in the visible month, **When** the list renders, **Then** they appear in
   date order with title, detail/location and a state badge.
2. **Given** the month is changed, **When** the calendar moves, **Then** the list follows to the
   new month.

---

### User Story 4 - Set the default working week (Priority: P2)

An operator can set a speaker's **default working week** (e.g. Mon–Fri). Days outside the working
week are shown subtly de-emphasised on the calendar, reflecting that the speaker does not normally
work then.

**Why this priority**: A helpful default that shapes the calendar's reading, but secondary to
entries themselves.

**Independent Test**: Change the working week; confirm the non-working days are visually
de-emphasised and the setting persists.

**Acceptance Scenarios**:

1. **Given** the Sync panel, **When** the operator selects a working week, **Then** it is saved and
   non-working days are de-emphasised on the calendar.

---

### User Story 5 - Availability changes are attributed and internal (Priority: P2)

Every add/edit/remove of an entry (and a working-week change) is attributed and appears in the
History tab, dashboard feed and statistics; and no availability data is exposed in any
publish-safe/public representation of a speaker.

**Why this priority**: Consistency and the internal boundary matter, though the calendar delivers
value before this wiring.

**Independent Test**: Add then remove an entry; confirm both attributed events appear in History;
confirm the publish-safe shape contains no availability data.

**Acceptance Scenarios**:

1. **Given** an availability change, **When** History is viewed, **Then** it appears attributed
   with a day-month-year timestamp.
2. **Given** any availability data, **When** publish-safe data is produced, **Then** it contains
   no availability entries or settings.

---

### Edge Cases

- **Multiple entries on the same day** (e.g. a hold and a blackout): the day shows a clear state;
  the list shows each entry separately. (v1 shows the highest-precedence state on the grid cell —
  confirmed > blocked > pencilled > available — with the list giving the full picture.)
- **An entry spanning a month boundary**: shown correctly in each month it touches.
- **End date before start date**: refused with a factual message.
- **A speaker with no entries and no working week set**: the calendar renders empty with a sensible
  default working week (Mon–Fri) applied.
- **Google Calendar connect**: shown as a clearly-marked, not-yet-active control in v1 (the
  integration is a later feature); it never implies a live sync.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a per-speaker month calendar (Monday-first) with previous/next
  month navigation.
- **FR-002**: The system MUST support four availability states — **available, pencilled, confirmed,
  blocked** — each with a fixed colour (green, yellow, blue, red) and label, shown on the day cells
  and in a legend. This vocabulary is fixed in code (Constitution V) and is distinct from the
  talent's overall status vocabulary.
- **FR-003**: An availability **entry** MUST carry a state, a title, an optional detail, an optional
  location, and a start and end date (all-day; end ≥ start); its state is shown on every day in its
  range.
- **FR-004**: Operators MUST be able to add an entry (including a quick "Block dates" action that
  creates a blocked entry over a range), edit an existing entry, and remove an entry.
- **FR-005**: The system MUST refuse an entry whose end date is before its start date, with a
  factual message.
- **FR-006**: The system MUST show a "This month" list of the visible month's entries in date order,
  each with its date, title, detail/location and a state badge.
- **FR-007**: The system MUST let an operator set the speaker's default **working week**; days
  outside it are visually de-emphasised on the calendar. The setting persists per speaker.
- **FR-008**: When several entries fall on one day, the calendar cell MUST show a single clear state
  by a fixed precedence (confirmed > blocked > pencilled > available); the list MUST show every
  entry.
- **FR-009**: Every entry add/edit/remove and every working-week change MUST be attributed (operator
  + timestamp) and surfaced in the History tab, dashboard activity feed and statistics.
- **FR-010**: No availability data (entries or settings) MUST appear in any publish-safe or public
  representation of a speaker.
- **FR-011**: The Availability tab MUST replace the current "In development" placeholder.
- **FR-012**: A **Connect Google Calendar** control MUST be present but clearly marked as not yet
  active; the actual integration is out of scope for this feature.
- **FR-013**: All copy, dates and states MUST follow the product standards (UK English sentence
  case, day-month-year dates, no emoji, fixed state vocabulary).

### Key Entities *(include if feature involves data)*

- **Availability entry**: a dated commitment/absence for a speaker — state (available / pencilled /
  confirmed / blocked), title, optional detail and location, start and end date, and who
  created/updated it and when.
- **Availability settings (per speaker)**: the default working week.
- **Change record (existing)**: extended with availability actions (added, updated, removed,
  working-week changed) flowing into history, the dashboard feed and statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can read a speaker's month — what's confirmed, pencilled, blocked and free
  — within five seconds of opening the tab.
- **SC-002**: Adding a blocked range or a confirmed engagement takes under 30 seconds and appears
  immediately on both the calendar and the list.
- **SC-003**: 100% of entries with an end date before the start date are refused.
- **SC-004**: The calendar and the "This month" list never disagree about the visible month's
  entries.
- **SC-005**: Zero availability fields appear in any publish-safe/public representation of a speaker.
- **SC-006**: Every availability change is attributable to an operator with a date and appears in the
  History tab.

## Assumptions

- **Four states, legend vocabulary (from the mockup)**: available / pencilled / confirmed / blocked.
  The mockup's day cells used casual synonyms (Hold / Booked / Unavailable); these are standardised
  to the legend words for a single fixed vocabulary. Distinct from the talent overall-status
  vocabulary (Available / On hold / Booked / Confirmed / Cancelled) to avoid collision.
- **All-day granularity**: entries are whole-day date ranges (no start/end times) — the norm for
  speaking engagements; timed slots are out of scope for v1.
- **Independent of talent status (from the mockup)**: the calendar does not change the speaker's
  overall status flag; any automatic derivation is deferred to the Bookings module.
- **Manual entry now; feeds Bookings later**: holds/confirmed engagements are entered by hand in
  v1; when Enquiries/Bookings exist they can create entries, but that link is a later feature.
- **Google Calendar deferred**: the connect control is present but inert in v1; two-way OAuth sync
  is its own future feature (as social-API sync was deferred in spec 007).
- **Cell precedence**: when a day has multiple entries, the grid shows confirmed > blocked >
  pencilled > available; the list disambiguates.
- **Reuses existing systems**: the change-record/history/dashboard/statistics fabric (spec
  004/005/006), the operator registry gate (spec 002), the profile-tab shell (spec 005), and the
  design-system tokens/Badge tones.
