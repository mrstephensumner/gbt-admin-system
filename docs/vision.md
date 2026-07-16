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

## Open questions

- Tech stack for the application shell (to be decided in the first `/speckit-plan`; the
  design system components are React references).
- Hosting/deployment target.
- Data model and how existing site data migrates in.
- Authentication and team roles/permissions.
