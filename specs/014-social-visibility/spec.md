# Spec 014 — Social & News: roster visibility & public-ready output

**Branch**: `014-social-visibility` · **Status**: Draft · **Date**: 23 Jul 2026
**Builds on**: spec 007 (Social & News), spec 004 (Dashboard), ADR 0004 (multi-tenant site engine)

## Summary

The Social & News tab already records a speaker's social profiles and press mentions. This spec
extends it in three directions the bookings team asked for:

1. **Roster visibility** — the team wants to see *what's being published across the whole roster*
   from the Dashboard, not one profile at a time: recent press coverage and notable social posts,
   attributed to the speaker, newest first.
2. **Notable posts** — a new lightweight content type for individual social posts that earned
   significant traction (a link, a platform, an interaction count, a date). Entered manually now;
   automatic detection of "significant" is explicitly out of scope (a later spec).
3. **Public-ready output** — mark which social/press/post items are cleared to appear on the public
   brand sites, and expose them through a publish-safe boundary that leaks no internal fields. No
   public site renders this yet (ADR 0004's engine is future work); this spec establishes the
   boundary so the engine can consume it later without retrofitting.

It also lays an inert **connect stub** for the deferred follower-sync integration (spec 015),
mirroring the deferred Google-Calendar pattern in spec 012.

## Out of scope (deferred)

- **Real follower/subscriber sync** from platform APIs — per-platform OAuth/keys, some paid; no
  public follower API exists for LinkedIn personal profiles. Its own spec (015). This spec ships
  only the disabled "connect" affordance.
- **Automatic detection** of which posts got "significant interactions" — manual entry only here.
- **Rendering** social/press/posts on a live public site — needs the ADR-0004 engine.

## User stories

### US1 — Log a notable post (P1)
As a bookings-team operator, I record a social post that performed well, so the roster's momentum
is captured and visible.
- **S1**: On a speaker's Social & News tab, "Notable posts" is a card alongside Social profiles and
  Press & news. I add a post with platform, https link, optional caption, interaction count, and
  posted date.
- **S2**: Posts list newest-first by posted date; each shows platform, caption, interactions
  (abbreviated, e.g. 12.5k), and date, linking out to the post.
- **S3**: I can remove a post. Add and remove are attributed in History / dashboard activity.
- **S4**: Empty state reads plainly ("No notable posts recorded yet.").

### US2 — See the roster's coverage from the Dashboard (P1)
As the team, we see recent coverage and notable posts across every speaker in one place.
- **S1**: The Dashboard has a "Roster in the news" section listing recent press mentions AND notable
  posts across the whole roster, interleaved newest-first by their own date.
- **S2**: Each row names the speaker (with reference), the item (headline/outlet, or platform +
  interactions), and its date, and deep-links to that speaker's Social & News tab.
- **S3**: The section aggregates in SQL (constant cost on a 5,000-record roster, per SC of spec 004)
  and shows an empty state when nothing is logged.

### US3 — Deferred follower sync is visible but inert (P2)
As an operator, I can see that automatic follower sync is coming without it doing anything yet.
- **S1**: Each social profile shows a disabled "Connect · coming soon" control. It performs no
  action and cannot be enabled. Follower counts remain manually editable exactly as today.

### US4 — Mark items for the public sites (P1, boundary)
As an operator, I control which social/press/post items are cleared for public brand sites.
- **S1**: Each social profile, press mention, and notable post carries a "Show on public sites"
  toggle. It defaults **on** for this inherently-public information; operators can switch any item
  off to keep it internal.
- **S2**: A publish-safe read (`publishSafeSocial`) returns only items toggled on, and only their
  public fields — never internal attribution (who set a follower count, added-by, timestamps) and
  never follower counts flagged internal. The talent serialization never includes any of this.
- **S3**: Toggling public on/off is attributed in History.

## Functional requirements

- **FR-001** Notable posts are a first-class per-talent record: `platform` (fixed vocab, reusing the
  social platform list), `url` (https), `caption` (optional, ≤300), `interactions` (non-negative
  integer), `posted_on` (`YYYY-MM-DD`). Add/remove write `change_record` rows.
- **FR-002** The Dashboard "Roster in the news" feed merges press mentions and notable posts across
  all non-archived talent, newest-first by item date, capped (e.g. 12), each with speaker
  reference/name and a deep link to `?tab=social`.
- **FR-003** Social profiles, press mentions, and notable posts each carry a boolean `public` flag,
  default true. Toggling it writes a `change_record`.
- **FR-004** `publishSafeSocial(d1, talentId)` returns `{ profiles, mentions, posts }` containing
  only `public = 1` rows and only publish-safe fields: profiles → `{platform, url, handle,
  followers}`; mentions → `{title, outlet, url, published_on}`; posts → `{platform, url, caption,
  interactions, posted_on}`. No `*_set_by`, `*_by`, `created_at`, or internal ids leak.
- **FR-005** The follower-sync "connect" control is present, disabled, and non-functional.
- **FR-006** Copy is British English, sentence case, no emoji; the platform vocabulary and follower
  abbreviation reuse the existing `shared/social.ts` helpers (Principle V — one source of truth).

## Success criteria

- **SC-001** A notable post added on the tab appears in the tab list and in the Dashboard feed,
  attributed, within one refresh.
- **SC-002** The Dashboard feed for a 5,000-record roster runs in a bounded, constant number of
  queries (no per-talent fan-out).
- **SC-003** `publishSafeSocial` for a talent with a mix of public/internal items returns only the
  public ones and exposes none of the internal attribution fields (asserted in tests).
- **SC-004** The talent serialization exposes no social/press/post data at all (unchanged boundary).
- **SC-005** Every add, remove, and public-toggle action is attributed in History with the operator.

## Constitution check

- **I Spec-driven** — this document precedes implementation; plan + tasks follow.
- **II Repo of record** — CHANGELOG + case-study updated in-commit; ADR only if a new decision
  arises (the publish-safe boundary reuses ADR 0004's principle — no new ADR expected).
- **III Design system** — new cards/toggle/stub reuse existing tokens and components.
- **IV Multi-brand** — the `public` flag + `publishSafeSocial` are exactly the interface ADR 0004
  requires; no brand is hard-coded (social/press/posts are talent-global, shown wherever the talent
  is published).
- **V Operational** — fixed vocab reused; dense, keyboard-friendly; abbreviated reach.
- **VI Verified** — unit (validation + publish-safe field boundary), integration (CRUD, toggle,
  dashboard feed, leak guard), e2e (tab + dashboard), all green before merge.
