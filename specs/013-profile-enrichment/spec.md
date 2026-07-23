# Feature Specification: Profile Enrichment — per-site AI biographies

**Feature Branch**: `013-profile-enrichment`

**Created**: 2026-07-23

**Status**: Draft

**Input**: Owner brief + verified research (task wb7er9ls1). A talent appears on 7+ separate network-site domains; identical bios cause cross-domain cannibalisation (Google shows one, filters the rest). Solution: an AI-generated, audience-optimised biography **per network site**, grounded in the talent's real facts, tuned by each site's editorial brief, reviewed and approved by an admin **and** the talent before it goes live. British English only.

## Clarifications (owner, 23 Jul 2026)

- **Source**: the AI rewrites from the master biography **plus** structured inputs (headline, topics, and optional pasted source material for achievements/testimonials). It must not invent facts.
- **Key**: one **org-level** Anthropic API key for the whole network, stored **encrypted**, never sent to the browser, never logged, never in public output.
- **Scope**: **bios only** for now (page titles / meta descriptions optimised manually elsewhere).
- **Fallback**: a site with no approved enriched bio still publishes the master bio; the missing per-site bio is surfaced as **incomplete** so the team can see the gap.
- **Approval**: **admin approves, and the talent approves their own bio** before it is published (a legal review-right, given publisher liability for AI text under UK law).
- **Uniqueness**: a **similarity score** is surfaced as a reviewer flag (not a hard gate — per research, no % makes a page "safe"; genuine per-audience value is the real bar).
- **Style**: **British English only**; an org-level **banned-words/phrases list** (clichéd "AI tells") is enforced. No AI-disclosure label (not legally required for marketing bios).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure enrichment once for the whole network (Priority: P1)

An owner opens **AI enrichment settings** and enters the organisation's Anthropic API key, picks a
model, and maintains the banned-words list and house-style note. The key is stored securely and is
never shown again in full or exposed anywhere.

**Why this priority**: Nothing can be generated without a securely-stored key and the org rules.

**Independent Test**: Save a key + banned words; confirm the key is accepted, is not returned in
full by any read, and generation can subsequently use it.

**Acceptance Scenarios**:

1. **Given** the settings screen, **When** the owner saves an Anthropic key, **Then** it is stored
   encrypted and thereafter shown only as a masked hint (e.g. last 4 chars), never in full.
2. **Given** settings, **When** anyone reads them (API or UI), **Then** the raw key is never
   returned, and it never appears in logs or any public/publish-safe output.
3. **Given** no key is configured, **When** an operator tries to generate a bio, **Then** it is
   refused with a message directing them to configure the key.

---

### User Story 2 - Give each network site an editorial brief (Priority: P1)

An admin sets, per network site, the brief that steers generation: the site's audience/positioning,
tone, an ideal word-count band, and anything to include or avoid. (e.g. Great Business Speakers →
"corporate bookers; commercial, ROI-focused; 120–180 words".)

**Why this priority**: The brief is what makes each site's bio genuinely different, not reworded —
the core of avoiding cannibalisation.

**Independent Test**: Set a brief on a site; confirm it persists and is used as generation context.

**Acceptance Scenarios**:

1. **Given** a network site, **When** an admin saves its editorial brief, **Then** it persists and
   is available to the generator.
2. **Given** a site with no brief, **When** a bio is generated for it, **Then** generation still
   works using sensible defaults, and the missing brief is discoverable.

---

### User Story 3 - Generate a grounded, on-brand bio for a site (Priority: P1)

From a speaker's **Profile Enrichment** tab, an operator generates a biography for a given network
site. The system builds a prompt from the speaker's real facts (master bio, headline, topics,
optional source material) + the site brief + British-English and banned-words rules, calls the
model, and stores the result as a **draft** with its word count and a **similarity score** against
the master bio. The generator must not introduce facts absent from the source.

**Why this priority**: This is the feature's engine.

**Independent Test**: Generate for a site; confirm a draft appears with body, word count, similarity
score, and that its facts trace to the source (no invented credentials).

**Acceptance Scenarios**:

1. **Given** a configured key and a speaker with a master bio, **When** an operator generates for a
   site, **Then** a draft bio is produced in British English, within (or flagged against) the site's
   word-count band, avoiding banned words, and stored with word count + similarity score.
2. **Given** a generated draft, **When** it is reviewed, **Then** any banned-word occurrences and a
   high similarity-to-master score are visibly flagged for the reviewer.
3. **Given** generation fails (bad key, model error), **Then** the operator sees a factual error and
   no partial/garbage draft is stored.
4. **Given** a draft exists, **When** the operator regenerates, **Then** a new draft replaces it
   (the previous draft is not retained in v1).

---

### User Story 4 - Review, edit, and dual-approve before publishing (Priority: P1)

An operator edits the draft as needed. An **admin approves** it; the **talent approves** their own
bio; only then can it be **published** to that site. Each approval is attributed. A published bio is
public content; drafts and unapproved bios are internal.

**Why this priority**: Publisher liability (UK law) makes grounded facts + the talent's own sign-off
essential; approval is the intent/quality gate that keeps the network clear of "scaled content"
risk.

**Independent Test**: Take a draft through edit → admin approve → talent approve → publish; confirm
each transition is gated and attributed, and only the published bio is publish-safe.

**Acceptance Scenarios**:

1. **Given** a draft, **When** an admin approves, **Then** its state advances and records who/when.
2. **Given** an admin-approved bio, **When** the talent's approval is recorded, **Then** its state
   advances and records the talent's approval (who/when).
3. **Given** a bio lacking either approval, **When** publish is attempted, **Then** it is refused
   with a factual message naming the missing approval.
4. **Given** a fully-approved bio, **When** it is published, **Then** it becomes the site's public
   biography and is included in publish-safe output for that site only.
5. **Given** a published bio, **When** the master bio or draft is later edited, **Then** the
   published version does not silently change — re-approval is required to republish.

---

### User Story 5 - See coverage and the missing-bio gaps (Priority: P2)

The Profile Enrichment tab shows, for each site the talent is published to, the enrichment status
(none / draft / approved / published) and the similarity score, so the team can see at a glance
which sites still need a bespoke bio. A site published without an approved enriched bio is flagged
as **incomplete** (it falls back to the master bio meanwhile).

**Why this priority**: Coverage visibility drives the work, but the generate/approve loop delivers
value first.

**Independent Test**: With a talent on three sites and one enriched, confirm the tab shows one
published and two incomplete.

**Acceptance Scenarios**:

1. **Given** a talent on several sites, **When** the tab renders, **Then** each site shows its
   enrichment status and similarity score, and sites without an approved bio are flagged incomplete.

---

### Edge Cases

- **No key / no credit / model error**: generation refused or fails cleanly with a factual message;
  nothing partial stored.
- **Generated bio too similar to the master** (high similarity score): allowed but clearly flagged;
  the reviewer decides. There is deliberately no hard percentage gate.
- **Banned words slip through**: occurrences are highlighted for the reviewer; publishing a bio with
  flagged banned words is allowed but discouraged (visible warning).
- **Talent not published to a site**: enrichment can still be prepared, but "incomplete" flags apply
  only to sites the talent is actually published to.
- **Master bio missing**: generation is refused with a message (nothing to ground from).
- **Editing after publish**: the live published bio is immutable until a new version is re-approved
  and re-published (no silent drift).
- **British English**: American spellings in the output are treated as a quality flag for the
  reviewer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let an owner store an organisation-level Anthropic API key **encrypted
  at rest**; the raw key MUST never be returned by any read, shown in full, logged, or included in
  any public/publish-safe output. Reads may show only a masked hint.
- **FR-002**: The system MUST let an owner choose the generation model and maintain an org-level
  banned-words/phrases list and an optional house-style note; British English is always enforced.
- **FR-003**: The system MUST let an admin set, per network site, an editorial brief (audience/
  positioning, tone, ideal word-count band, include/exclude notes) used as generation context.
- **FR-004**: The system MUST generate a per-site biography for a talent by prompting the configured
  model with the talent's real facts (master biography, headline, topics, optional source material)
  + the site brief + British-English and banned-words rules.
- **FR-005**: The generator MUST be instructed and constrained to use only facts present in the
  source material and MUST NOT introduce credentials, awards, or claims not in the source.
- **FR-006**: Each generated bio MUST be stored as a draft with its word count and a **similarity
  score** measured against the master bio; banned-word occurrences MUST be detectable and surfaced.
- **FR-007**: Generation failures MUST surface a factual error and MUST NOT store a partial or
  invalid draft.
- **FR-008**: A per-site bio MUST move through states: **draft → admin-approved → talent-approved →
  published**; publishing MUST be refused unless both the admin and the talent approvals are
  recorded, and the refusal MUST name what is missing.
- **FR-009**: Admin approval, talent approval, and publication MUST each be attributed (who/when) and
  surfaced in the History tab, dashboard feed and statistics.
- **FR-010**: Only a **published** per-site bio MAY appear in publish-safe/public output, and only
  for the site it was published to. Drafts, unapproved bios, briefs, settings and the API key MUST
  never appear in publish-safe output.
- **FR-011**: A published bio MUST be immutable in place — a later edit requires re-approval and
  re-publication; the live version MUST NOT silently change.
- **FR-012**: The Profile Enrichment tab MUST show, per site the talent is published to, the
  enrichment status and similarity score, and MUST flag sites published without an approved enriched
  bio as **incomplete** (falling back to the master bio meanwhile).
- **FR-013**: If no API key is configured, or the master bio is missing, generation MUST be refused
  with a factual, actionable message.
- **FR-014**: All copy MUST be British English sentence case, no emoji; money/date/format standards
  apply where relevant. The Profile Enrichment tab replaces the current "In development" placeholder.

### Key Entities *(include if feature involves data)*

- **Enrichment settings (org, single row)**: encrypted Anthropic API key (+ masked hint), model,
  banned-words list, house-style note.
- **Site editorial brief (per network site)**: audience/positioning, tone, word-count min/max,
  include/exclude notes.
- **Talent source material (per talent, optional)**: extra factual material (achievements,
  testimonials) the generator may ground from, beyond the master bio/headline/topics.
- **Per-site bio (per talent × site)**: body, state (draft/admin-approved/talent-approved/
  published), word count, similarity score, model used, and attribution for generation + each
  approval + publication.
- **Change record (existing)**: extended with enrichment actions (generated, admin-approved,
  talent-approved, published) flowing into history/dashboard/statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The raw Anthropic API key is never retrievable through any read path and never appears
  in logs or publish-safe output (verified by inspection + tests).
- **SC-002**: A generated bio for a site is in British English, respects the site's word-count band
  (or is flagged), and contains no facts absent from the source (spot-checked; grounding enforced by
  prompt + review).
- **SC-003**: 100% of publish attempts without both approvals are refused, naming the missing one.
- **SC-004**: Only published bios appear in publish-safe output, and only for their site; 0 drafts/
  settings/keys leak (verified by tests).
- **SC-005**: Every generate/approve/publish action is attributable to an operator (or the talent,
  for talent approval) with a date and appears in History.
- **SC-006**: Each site's bio carries a visible similarity-to-master score and banned-word flags, so
  a reviewer can judge differentiation in seconds.

## Assumptions

- **Talent approval (v1)**: recorded as an attributed attestation the admin captures on the talent's
  behalf (talent name/date/method) — satisfying the legal review-right and the dual-approval gate.
  A self-service tokenised talent review link (no login) is a natural fast-follow and is **deferred**
  to its own feature; the data model reserves the talent-approval fields for it.
- **Similarity measure**: a dependency-free lexical measure (word-trigram Jaccard) against the master
  bio, surfaced as a **reviewer flag**, not a compliance gate — consistent with the research finding
  that no external % threshold guarantees SEO safety.
- **Source material**: v1 grounds on master bio + headline + topics + an optional per-talent
  free-text "source material" field; dedicated structured achievements/testimonials records are a
  future refinement.
- **Publish-safe first**: the published per-site bio is the first publish-safe content the system
  emits; the actual public rendering is the multi-tenant engine's job (ADR 0004). This feature
  produces and gates the content; a `publish-safe` read shape exposes only published bios.
- **Key encryption**: the API key is encrypted with AES-GCM using a Worker-held key-encryption key
  (a platform secret), never stored or returned in plaintext.
- **Model default**: a current Anthropic model, admin-selectable; British English enforced by prompt.
- **Onboarding tie-in**: the enrichment tab is the "section" that surfaces missing per-site bios in
  v1; wiring per-site coverage into the fixed onboarding checklist is a small, optional follow-up
  (the onboarding step vocabulary is fixed, so it is not modified here).
- **Reuses**: the network/brand model (spec 009), the change-record/history/dashboard/statistics
  fabric, the permission model (spec 002 — settings owner-only), and the publish/publication concept
  (spec 001/009).
