# Feature Specification: Publishing Network

**Feature Branch**: `009-publishing-network`

**Created**: 2026-07-17

**Status**: Draft

**Input**: Owner annotated the Site selector tab: manage where talent can be published
across the network of brand websites. A "Network" admin area defines the sites; each
talent's tab (renamed "Network") lists every site to publish that speaker to.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage the network of sites (Priority: P1)

An authorised operator maintains the network's websites in a Network settings screen:
add a site (name, address, and a short slug used as its key), rename it, set its address,
and activate or deactivate it. Sites are the brands talent get published to (Great British
Speakers today; sister brands and new-market sites to follow). Deactivating a site removes
it from publish choices without disturbing anything already published there.

**Independent Test**: Add two sites, edit one, deactivate one; verify the active list,
the slug uniqueness rule, and that a deactivated site keeps its existing publications.

**Acceptance Scenarios**:

1. **Given** the Network screen, **When** an operator adds a site (name + slug, optional
   https address), **Then** it appears in the network and becomes available to publish
   talent to.
2. **Given** two sites with the same slug, **Then** the second is refused with a factual
   message (slugs are unique).
3. **Given** a site, **When** its name or address is edited, **Then** the change persists.
4. **Given** a site with talent published to it, **When** it is deactivated, **Then** it
   leaves the publish choices but its existing publications and their history remain.
5. **Given** managing the network, **Then** only the Owner (or an operator granted the
   network permission) may add, edit, or deactivate sites.

---

### User Story 2 - Publish a talent across network sites (Priority: P2)

On a speaker's **Network** tab (formerly "Site selector") every active network site is
listed with its publication state and a publish/unpublish control. Publishing still
requires a complete, non-archived profile (the existing gate). A speaker can be live on
several sites at once, each tracked independently with who published and when.

**Independent Test**: With several active sites, publish a complete talent to two of them
and not a third; verify independent per-site state, who/when, and that the completeness
gate and archive rules still hold.

**Acceptance Scenarios**:

1. **Given** several active sites, **When** an operator opens a talent's Network tab,
   **Then** every active site is listed with its state; a site the talent is published to
   (even if since deactivated) is also shown so it can be unpublished.
2. **Given** a complete talent, **When** published to a site, **Then** that site shows
   published with who/when; other sites are unaffected.
3. **Given** an operator without the publish grant, **Then** the Network tab shows state
   read-only, no publish controls (unchanged rule).

### Edge Cases

- A talent published to a site that is later deactivated: still shown on the talent's
  Network tab (so it can be unpublished), but the site is not offered for new publishing.
- Sites cannot be permanently deleted while any talent is published to them — deactivate
  instead (protects integrity and history).
- Removed operators keep attribution on publications and site changes.

## Requirements *(mandatory)*

- **FR-001**: A new **network** permission area (Owner holds it automatically; grantable
  to operators) governs adding, editing and deactivating sites.
- **FR-002**: Operators with the permission MUST be able to add a site (unique slug,
  display name, optional https address), edit its name/address, and set it
  active/inactive; slugs are unique and immutable once set.
- **FR-003**: Deactivating a site MUST remove it from new-publish choices while preserving
  its existing publications and their history; sites MUST NOT be permanently deletable
  while any talent is published to them.
- **FR-004**: A talent's Network tab MUST list all active sites plus any inactive site the
  talent is already published to, each with independent publication state, who/when, and a
  publish/unpublish control subject to the existing publish permission and completeness
  gate.
- **FR-005**: Publishing rules are unchanged: only complete (day rate, biography, photo),
  non-archived talent can be published; archiving auto-unpublishes from every site.
- **FR-006**: Site definitions are internal configuration; the eventual public content API
  (ADR 0003) will serve each site only its own published, publish-safe talent.

## Key Entities

- **Site** (extends the existing brand): slug (unique key), name, optional https address,
  active flag, ordering. Talent are published per site via the existing publication link.

## Success Criteria *(mandatory)*

- **SC-001**: An operator can add a network site and publish a talent to it in under a
  minute.
- **SC-002**: Deactivating a site removes it from publish choices with zero loss of
  existing publications or history (verified).
- **SC-003**: 100% of site-management actions are restricted to holders of the network
  permission (verified by direct attempts).

## Assumptions

- A "site" is a brand in the existing model — this feature makes brands manageable and
  multi-valued through the UI, realising the multi-site backbone (ADR 0003).
- Slugs are stable identifiers the future public content API will key on; hence immutable.
- The sister brands (e.g. Great British Presenters, Great British Voices) and new-market
  sites are added by the Owner through this screen; none are assumed pre-seeded.
