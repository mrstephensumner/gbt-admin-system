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

## Open questions

- ~~Tech stack~~ — decided 16 Jul 2026: Cloudflare-native TypeScript (React SPA + Hono +
  D1 + R2, one Worker). See [decisions/0002-tech-stack.md](decisions/0002-tech-stack.md).
- How existing site data migrates in (future feature).
- First-party authentication and team roles/permissions (interim: Cloudflare Access —
  see ADR 0002).
