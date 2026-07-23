# 0003 — Multi-site content delivery: one database behind 7+ websites

- **Date:** 16 Jul 2026
- **Status:** Accepted (requirement recorded). Delivery mechanism now settled in
  [ADR 0004](0004-multi-tenant-site-engine.md) — a multi-tenant Worker that renders every
  brand site by hostname, rather than only exposing a read-only content API.
- **Context:** The owner confirmed the admin is intended to be the backbone of **7+
  external brand websites** (Great British Speakers, sister brands, rebuilt sites, and
  new-market sites), all powered off the same database. This makes constitution
  Principle IV ("one source of truth, multi-brand from the start") a concrete
  architectural requirement, not just a data-modelling guideline.

## Decision

1. **The admin is the system of record.** All talent, media, publication state, topics
   and SEO metadata live here; the public websites are presentation layers that consume
   this data. No site holds its own copy of the truth (constitution IV; spec-003
   established "seed, not sync" for imports on the same principle).

2. **Sites consume published data through a read-only content interface** served by the
   same Cloudflare Worker (a future feature). Shape, per the data already modelled:
   - Keyed by **brand** — a site only ever sees talent **published to its brand** (the
     `publication` table already models exactly this per-brand state).
   - **Read-only and unauthenticated-appropriate** — a separate surface from the
     Access-gated admin API; it exposes only publish-safe fields (never day rates,
     private contact details, internal notes, or operator identities).
   - **Media via R2** through the Worker (or R2 public/CDN URLs for published assets),
     reusing the existing photo pipeline; showreels are already external links.

3. **The Cloudflare-native stack is reaffirmed for this scale** (extends
   [ADR 0002](0002-tech-stack.md)). Serving many read-heavy sites globally is a strength
   of this platform, not a strain:
   - **D1 read replication** distributes read load for the content API across regions.
   - **R2 zero egress** means serving the same media across 7+ sites carries no
     per-download bandwidth cost — a material saving at multi-site scale.
   - **Workers at the edge** put the content API physically close to every site's
     visitors.
   This directly answers the "should we move to Supabase?" question: the multi-site,
   read-heavy, media-rich shape **strengthens** the case for staying (edge reads +
   zero-egress media), where an external Postgres would add a network hop per read and
   egress cost per asset. Revisit only if a genuine Postgres-specific need appears
   (heavy cross-dataset analytics, extensions), per ADR 0002.

## Consequences

- The next major architectural feature is a **public content API** (read-only, per-brand,
  publish-safe fields only) with its own spec — the publication gate and per-brand model
  built in spec 001 are its foundation, so no re-architecting is needed to add it.
- Every feature must keep asking "is this field publish-safe?" — internal data (notes,
  operator identities, private contact details, unreleased SEO drafts) must be
  distinguishable from publish-safe data so the content API never leaks it.
- Media strategy scales with the site count: R2 for images/documents; if raw video
  hosting is ever added (spec 008 deferred it), **Cloudflare Stream** is the multi-site
  answer over raw R2 blobs.
- Scale headroom is comfortable: D1 (10 GB ceiling) holds well over 100k text records;
  a 15,000-talent roster across all brands is a small fraction of that.
