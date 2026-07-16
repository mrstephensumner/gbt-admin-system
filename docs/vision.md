# Vision

## The one-liner

One admin system to run Great British Talent Ltd day to day, and to administer every
customer-facing website the company operates — current, rebuilt, and future.

## Why

Great British Talent operates Great British Speakers and sister talent brands. Core
operations — talent management, enquiries, bookings, clients, invoicing — currently live
across the existing websites' back offices. This project centralises them in one purpose-built
tool with a single design language, so the team has one place to work and the websites become
presentation layers over shared data.

## Scope horizons

1. **Horizon 1 — run the business.** The core back office: speakers/talent, enquiries
   pipeline (New → Quoted → Confirmed → Lost), bookings (Available / On hold / Booked /
   Confirmed / Cancelled), clients, invoices, dashboard KPIs.
2. **Horizon 2 — administer existing sites.** Connect the admin to the current
   Great British Speakers site and sister-brand sites so talent and content are managed here,
   not in each site's own back end.
3. **Horizon 3 — power new sites.** Rebuilt versions of the existing sites and entirely new
   sites for new markets, all administered from this system (multi-brand, multi-market).

**The database is the backbone of 7+ external websites** (owner-confirmed 16 Jul 2026):
every brand site is a presentation layer over this one system of record, consuming its
brand's published talent through a read-only content interface. This is why publication
is modelled per brand from day one, why imports "seed not sync", and why the
Cloudflare-native stack (edge reads, R2 zero-egress media) was reaffirmed — see
[decisions/0003-multi-site-content-delivery.md](decisions/0003-multi-site-content-delivery.md).

## Product principles (draft — to be formalised in the constitution)

- **Operational, not promotional.** This is a working tool for the bookings team; calm,
  dense, fast. The design system encodes this.
- **One source of truth.** Talent, client and booking data lives here; websites consume it.
- **Multi-brand from the start.** Data and UI decisions should not hard-code a single brand.
- **Spec-driven.** Every feature starts as a spec-kit specification in `specs/`.

## Hosting

The admin system will be served from **greatbritishtalent.online**, which is configured in
**Cloudflare** (DNS/zone ready as of 16 Jul 2026; no deployment bound to it yet). Deployment
targets should therefore assume the Cloudflare platform unless a decision record says
otherwise.

## Mockup-derived backlog (16 Jul 2026)

A newer Claude Design mockup of the admin (shared by the owner; not yet in
`design-system/`) shows the intended breadth of the platform. Recorded here as backlog,
in no committed order: Enquiries, Bookings, Clients, Invoices modules; talent
Availability; Social & News feeds and follower stats; Profile Enrichment; Statistics;
Site Selector / per-site profiles (multi-brand publication surfaces); fee schedules
beyond a single day rate; talent data Export; import update-existing mode.

## External data providers (candidate, not committed)

- **DataForSEO** (https://dataforseo.com/) — likely provider for the automated data that
  spec 007 (Social & News) deferred (FR-007), and possibly other enrichment. Fit
  assessment to verify when we spec the integration:
  - **Strong fit — news/press discovery**: their SERP (Google/Bing News) and Content
    Analysis APIs can find recent coverage and web mentions of a speaker by name/brand,
    to auto-populate the press-mentions log built in spec 007.
  - **Weaker fit — social follower counts**: DataForSEO is SEO/SERP-centric, not a native
    social-graph API; per-platform follower numbers (LinkedIn/Instagram/TikTok) may need
    platform APIs or a specialist social-analytics provider. Confirm current endpoints
    before assuming coverage.
  - The spec-007 tables (`talent_social_link.followers` with attributed stamps,
    `talent_press_mention`) are already the landing place for whatever provider is chosen;
    a sync job would write to them, preserving the manual-entry path alongside.

## Open questions

- ~~Tech stack~~ — decided 16 Jul 2026: Cloudflare-native TypeScript (React SPA + Hono +
  D1 + R2, one Worker). See [decisions/0002-tech-stack.md](decisions/0002-tech-stack.md).
- How existing site data migrates in (future feature).
- First-party authentication and team roles/permissions (interim: Cloudflare Access —
  see ADR 0002).
