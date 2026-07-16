# Feature Specification: Social & News

**Feature Branch**: `007-social-news`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Build the Social & News talent tab tonight — the speaker's
public presence: social profiles with follower reach, and recent news/press mentions,
per the design mockup and the placeholder's promise."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Social profiles with tracked reach (Priority: P1)

An operator opens a speaker's Social & News tab and records their social profiles —
platform, link, handle — and the current follower count for each. Follower counts carry
an "as of" date and who updated them, because reach numbers age; updating a count
restamps both. The tab totals the reach across platforms — the number the team quotes in
fee conversations.

**Independent Test**: Add links across platforms with counts; verify totals, "as of"
attribution, count updates restamping, link removal; verify a link without a count shows
factually rather than as zero.

**Acceptance Scenarios**:

1. **Given** a speaker, **When** an operator adds a social profile (platform from a
   fixed list, address, optional handle, optional follower count), **Then** it lists
   with a working link and, where present, the count with "as of" date and updater.
2. **Given** several profiles with counts, **Then** the tab shows total reach across
   platforms; profiles without counts are shown as "Not counted", never as zero.
3. **Given** an operator updates a follower count, **Then** the new figure shows with a
   fresh "as of" and their identity.
4. **Given** a mistaken link, **Then** it can be removed; additions and removals appear
   in the speaker's history, attributed.
5. **Given** an address that is not a link (no https), **Then** saving is refused with
   a factual message.

---

### User Story 2 - Press & news mentions (Priority: P2)

The team logs press coverage as it happens: headline, outlet, link, publication date.
The tab lists mentions newest-first — a speaker's recent-news picture at a glance, and
evidence of profile momentum for clients.

**Independent Test**: Add mentions with varied dates; verify newest-first order, links,
attribution in history, and removal.

**Acceptance Scenarios**:

1. **Given** a mention (headline, outlet, link, published date), **When** saved, **Then**
   it lists newest-first by publication date with a working link.
2. **Given** a mistaken mention, **Then** it can be removed; both actions appear in the
   speaker's history.

---

### Edge Cases

- Very large follower counts display abbreviated (e.g. 1.2m) with the precise figure
  preserved.
- Duplicate platform entries are allowed (e.g. two YouTube channels) — real speakers
  have them.
- Archived speakers: tab remains readable and editable (record-keeping, as with notes).
- Removed operators' attributions persist (spec 002 FR-009).

## Requirements *(mandatory)*

- **FR-001**: Operators MUST be able to add social profile links to a talent record:
  platform (fixed vocabulary: LinkedIn, X, Instagram, TikTok, YouTube, Facebook,
  Website, Other), address (must be a well-formed https link), optional handle, optional
  follower count (non-negative whole number).
- **FR-002**: Follower counts MUST record when and by whom they were last set; updating
  a count MUST restamp both; a profile without a count MUST display as not-counted.
- **FR-003**: The tab MUST show total recorded reach across a speaker's profiles.
- **FR-004**: Operators MUST be able to log press mentions (headline, outlet, https
  link, publication date) listed newest-first by publication date, and remove them.
- **FR-005**: Adding or removing a link or mention MUST appear in the speaker's change
  history, attributed (follower-count updates are attributed on the profile itself).
- **FR-006**: All Social & News data is internal working data in this feature; no
  external surface exposes it. Baseline permission (any registered operator).
- **FR-007**: Automated follower sync and automatic news discovery are OUT of scope —
  they require platform API integrations (future spec); the structures built here are
  their landing place.

## Key Entities

- **Social link**: talent, platform (vocabulary), address, handle, follower count with
  set-at/set-by, created-at/by.
- **Press mention**: talent, headline, outlet, address, published-on date, added-at/by.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of follower figures display with their "as of" date and updater.
- **SC-002**: Total reach equals the sum of recorded counts exactly (verified
  automatically).
- **SC-003**: An operator records a complete social profile in under 20 seconds.
- **SC-004**: Mentions order by publication date, not entry order (verified).

## Assumptions

- Manual-first (FR-007): the agency team keys figures today; API-driven sync arrives as
  a future spec and will update the same records.
- Platform vocabulary is fixed in this feature; "Other" plus the handle field covers
  the long tail.
- Baseline permission, consistent with profile fields and notes.
