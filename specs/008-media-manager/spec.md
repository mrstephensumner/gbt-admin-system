# Feature Specification: Talent Media Manager

**Feature Branch**: `008-media-manager`

**Created**: 2026-07-16

**Status**: Draft

**Input**: Owner annotated the Photos tab: a media manager with **Headshots**, **At-events
photos**, and **Showreels** sections, plus an **SEO metadata** sidebar.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Categorised media on a profile (Priority: P1)

An operator manages a speaker's media in one place: **headshots** (the portrait shots,
one of which is the profile's avatar), **at-events photos** (the speaker in action), and
**showreels** (video links to YouTube/Vimeo/elsewhere). Each section adds and removes
independently. The avatar the rest of the admin shows is always a headshot, never an
event photo.

**Independent Test**: Upload photos to each image section and add showreel links; verify
they list in the right section, the avatar stays a headshot, removal works, and showreel
links render with a thumbnail where the provider allows.

**Acceptance Scenarios**:

1. **Given** the Media tab, **When** an operator uploads a photo choosing a category,
   **Then** it appears in that section only; the directory/dashboard avatar uses a
   headshot.
2. **Given** no headshot yet, **When** the first headshot is uploaded, **Then** it
   becomes the avatar; event photos never become the avatar.
3. **Given** a showreel link (https, optional title), **When** saved, **Then** it lists
   in Showreels with the provider and a thumbnail for YouTube/Vimeo, linking out.
4. **Given** any media item, **When** removed, **Then** it disappears and the removal is
   recorded in history, attributed.
5. **Given** a non-https or unrecognised showreel address, **Then** saving is refused
   with a factual message.

---

### User Story 2 - SEO metadata sidebar (Priority: P2)

Alongside the media, an operator maintains the speaker's **SEO metadata** — meta title,
meta description, focus keyword — the fields that will drive their page when the websites
are administered from here. Saving records who updated it and when.

**Independent Test**: Set and edit the SEO fields; verify persistence, attribution, and
that a character-count guide reflects search-snippet limits.

**Acceptance Scenarios**:

1. **Given** the SEO sidebar, **When** an operator saves meta title, description and
   focus keyword, **Then** they persist and show when/by whom last updated.
2. **Given** an over-long meta title or description, **Then** a factual length guide is
   shown (title ~60, description ~160), without blocking a deliberate save.
3. **Given** an SEO change, **Then** it appears in the speaker's history, attributed.

### Edge Cases

- Archived speakers: media and SEO remain readable and editable (record-keeping).
- A showreel URL with no recognisable provider still saves and links out as "Other".
- Removed operators keep their attribution on media and SEO changes (spec 002 FR-009).

## Requirements *(mandatory)*

- **FR-001**: Photos MUST carry a category — headshot or at-event; uploads choose one
  (default headshot); existing photos are headshots.
- **FR-002**: The profile/directory/dashboard avatar MUST always be a headshot (the
  primary headshot, else any headshot, else the initials placeholder); event photos are
  never the avatar.
- **FR-003**: Operators MUST be able to add showreel video links (https address,
  optional title); the system records the provider (YouTube/Vimeo/Other) and shows a
  thumbnail where the provider allows; links open externally.
- **FR-004**: Operators MUST be able to remove any media item; media add/remove appears
  in the speaker's change history, attributed.
- **FR-005**: Each talent MUST have editable SEO metadata (meta title, meta description,
  focus keyword) recording last-updated by/at; SEO edits appear in history.
- **FR-006**: All media and SEO data is internal/administrative in this feature; baseline
  permission (any registered operator).
- **FR-007**: Raw video upload/hosting is OUT of scope — showreels are links to
  externally-hosted video (a future spec may add Cloudflare Stream upload).

## Key Entities

- **Photo** (existing, extended): gains a category (headshot | event).
- **Showreel**: talent, title, url, provider, added-at/by.
- **Talent SEO**: one per talent — meta title, meta description, focus keyword,
  updated-at/by.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of avatars across the admin are headshots (never event photos),
  verified with a talent whose only non-headshot is an event photo.
- **SC-002**: Media and SEO changes are 100% attributed in history.
- **SC-003**: An operator adds a showreel or sets SEO metadata in under 20 seconds.

## Assumptions

- Showreels are links (FR-007); the field/thumbnail design is the landing place if raw
  upload via Cloudflare Stream is added later.
- SEO field set mirrors the old site's RankMath fields (title/description/focus keyword),
  which the WordPress import already carried.
- Baseline permission, consistent with other profile data.
