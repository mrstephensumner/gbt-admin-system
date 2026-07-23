# Case Study & Project Log — GBT Admin System

> **Living document.** Started 16 Jul 2026 and maintained through the project's life as
> source material for a case study on localseo.agency. Newest milestones are appended to
> the timeline at the foot of this file.

---

## At a glance

| | |
|---|---|
| **Client** | Great British Talent Ltd — parent of Great British Speakers and sister talent brands |
| **Product** | A central admin platform to run the agency day to day and to power its family of websites |
| **Live at** | greatbritishtalent.online (behind Cloudflare Access) |
| **Approach** | Spec-driven development (GitHub spec-kit) governed by a written project constitution |
| **Stack** | Cloudflare Workers · React 19 SPA · Hono API · D1 (SQLite) · R2 object storage · Cloudflare Access |
| **Features shipped** | 8 specified, tested and deployed (see timeline) |
| **Real data** | 2,244 speaker profiles migrated from the legacy WordPress site, with photos |
| **Automated tests** | ~240+ across unit, integration (real-runtime) and browser end-to-end |
| **Documentation** | Constitution, 3 architecture decision records, full spec set per feature, changelog |

---

## The brief

Great British Talent runs a talent agency — speakers today, sister brands to follow —
where the core operations (managing talent, enquiries, bookings, clients, invoices) were
scattered across the back offices of individual WordPress websites. The owner wanted a
single, purpose-built tool to run the business, and — crucially — one that could become
the **administration hub and content backbone for every brand website**: the current
sites, rebuilt successors, and new sites for new markets. One source of truth; many
presentation layers.

The starting point was a design system (produced in Claude Design) and a brand identity —
a dark, dense, Union-Jack "operations console" — but no application.

## The approach: specify before you build

Rather than jump into code, the project adopted **spec-driven development** using GitHub
spec-kit, anchored by a **project constitution** ratified on day one. Six non-negotiable
principles governed every feature:

1. **Spec-driven development** — no feature without a specification; no spec implemented
   without a plan and task breakdown.
2. **The repository is the documentation of record** — changelog updated before every
   commit, docs kept in sync, decisions recorded as ADRs.
3. **Design-system conformance** — the handoff's tokens and components are the source of
   truth for the UI.
4. **One source of truth, multi-brand from the start** — nothing hard-codes a single
   brand, even while only one exists.
5. **Operational, not promotional** — a fast, dense working tool; fixed vocabularies
   (statuses, ID formats, currency and date formats) enforced in code, not just copy.
6. **Verified before merged** — risk-appropriate automated tests plus a real run-through
   of every user-facing change.

Every feature then flowed through the same cycle: **constitution → specify → clarify →
plan → tasks → implement → analyse**, with each stage committed to GitHub as a reviewable
artifact.

## The architecture

A single **Cloudflare Worker** serves both the React single-page app and a Hono JSON API,
backed by **Cloudflare D1** (SQLite at the edge) via the Drizzle ORM, with talent media in
**Cloudflare R2** object storage. Authentication is **Cloudflare Access** in front of the
domain, with the Worker independently verifying the access token — defence in depth.

Why this stack, recorded as a formal decision (ADR 0002): it is one deployable unit (one
deploy, one log stream, no CORS), it sits the data physically next to the code at the
edge, and it is inexpensive at the agency's scale. The multi-site requirement later
**reaffirmed** the choice (ADR 0003): serving many read-heavy brand sites globally is a
strength of Cloudflare's edge + D1 read replicas + R2's zero-egress media — where a
conventional external database would add a network hop per read and bandwidth cost per
asset.

## The build, feature by feature

Each of the following was specified, planned, implemented, tested and deployed as an
independent increment:

- **001 — Talent Management Module** *(v0.1.0)*. The foundation: create and maintain
  talent records with permanent `TAL-####` references and full change history; a
  directory that searches and filters responsively at 5,000+ records; a fixed status
  vocabulary; per-brand publication with completeness gating; archive-not-delete. Every
  change is attributed to the operator who made it.

- **002 — Admin Roles & Operator Management** *(v0.2.0)*. The security layer: an operator
  registry where the business owner is master admin and grants limited, per-person
  permissions (edit day rates, publish, archive, manage topics) enforced on the server —
  not merely hidden in the interface. Revoking a permission takes effect on the person's
  very next action. An append-only team audit trail records every access change.

- **003 — Roster Import from File**. Bulk-onboarding: upload a CSV/Excel/JSON export,
  validate it *before* anything is staged (with a reconciling report of every row),
  review and tidy candidates, then approve them into real records — one click for the
  whole roster. Re-uploads never duplicate; records already edited in the admin are never
  overwritten.

- **004 — Operations Dashboard**. The landing screen: live KPI tiles that deep-link into
  the filtered directory, "ready to publish" and "blocked from publishing" work lists
  that turn data into next actions, and an attributed activity feed — all computed from
  existing records.

- **005 — Talent Profile Workspace**. The profile reorganised into the design mockup's
  tabbed workspace, with a live Statistics tab (completeness, activity, profile facts)
  computed entirely from real data, and clearly-marked "in development" placeholders for
  roadmap modules so the platform's full shape is visible.

- **006 — Internal Talent Notes**. Attributed, timestamped internal notes on every
  profile — working memory for the team, woven into the same history and activity fabric
  as everything else.

- **007 — Social & News**. Social profiles with manually-tracked follower reach (each
  figure stamped with when and by whom) and a press-mentions log — the reach signals the
  team quotes in fee conversations. Built to be the landing place for automated data
  later.

- **008 — Talent Media Manager**. Categorised media — headshots, at-event photos and
  showreels — plus an SEO metadata sidebar (meta title, description, focus keyword) that
  will drive each talent's public page. The profile avatar is always a headshot.

## The real-data moment

The proof point: the client's live roster existed only in their old WordPress site. A
purpose-built converter turned the 84 MB WordPress export into an import-ready file —
**2,244 published speaker profiles** with biographies, topics and photos — which validated
100% clean and flowed through the import pipeline in seconds, fetching each speaker's
headshot from the live site on approval. The dashboard, directory and workspaces filled
with the real business.

## Security & governance

- **Two-layer authentication**: Cloudflare Access at the edge, plus independent token
  verification in the Worker.
- **Authorisation** by an in-app operator registry with per-person permission grants,
  default-deny for any capability an operator hasn't been granted.
- **Nothing is ever silently lost**: archive-not-delete, append-only change history and
  audit trails, permanent attribution even for removed operators.
- **The repository is the record**: every decision, spec and change is in GitHub, with the
  changelog updated in the same commit as the code it describes.

## Quality

Testing scaled with the product. By the eighth feature the suite ran to roughly **120
unit tests** (the shared domain rules — status vocabulary, references, money and date
formatting, permissions, fee bands, media parsing), **over 100 integration tests** running
inside the actual Cloudflare Workers runtime against a migrated database (the full
permission matrix, publication gating, import idempotence, attribution), and **~18
end-to-end browser journeys** driving the real interface. Every user-facing change was
also verified live in a browser before shipping.

## Results

- A live, secured, multi-feature admin platform on the client's own domain, built through
  a disciplined spec-driven process.
- The client's entire real roster migrated in — the tool is genuinely operational, not a
  demo.
- A codebase and documentation set from which any collaborator (or the client) can
  reconstruct every decision, backed by 240+ automated tests.
- An architecture proven to scale to the client's ambition: one database as the backbone
  of 7+ brand websites.

## What's next

- A **public content API** (read-only, per-brand, publish-safe fields only) so the brand
  websites can consume this data — the architectural keystone of the multi-site vision
  (ADR 0003).
- The roadmap modules already visible as placeholders: **Enquiries, Bookings, Clients,
  Invoices**, plus **Onboarding, Availability** and **Profile Enrichment**.
- **Automated data** for Social & News (candidate provider: DataForSEO for news/press;
  social follower sync via platform APIs).

## Colophon

Built with Claude Code using GitHub spec-kit for spec-driven development, on a
Cloudflare-native TypeScript stack. Every feature followed the constitution's cycle from
specification to verified deployment.

---

## Build timeline

- **16 Jul 2026** — Project founded: repository initialised, spec-kit set up, design
  system imported, constitution v1.0.0 ratified. Specs 001–008 specified, built, tested
  and deployed in sequence. Real roster (2,244 WordPress speaker profiles) converted and
  imported to production. Multi-site content-delivery architecture recorded (ADR 0003).
  Spec 008 (media manager with full editing controls — categorised photos, showreels,
  SEO metadata, drag reorder, avatar selection) completed and deployed. Multi-site
  content-delivery architecture recorded (ADR 0003). Full suite at this point: ~255
  automated tests (118 unit, 117 integration, 20 end-to-end).
- **17 Jul 2026** — Spec 009 (Publishing Network) built and deployed: the admin now
  manages the network of brand sites itself, turning it into the operational backbone for
  the 7+ external websites the client will run. Owners (and holders of the new `network`
  permission) can add, edit and deactivate sites; each site carries an immutable slug (the
  key public sites will read against), an https URL and a live published-talent count.
  Deactivate-not-delete keeps a retired site's publications intact. The profile "Site
  selector" tab was renamed "Network" to match. Migration 0007. Also untracked the
  `.wrangler/` local dev state from git (it had been committed by accident, dragging D1
  SQLite and thousands of R2 photo blobs into every commit) and gitignored it. Full suite:
  264 automated tests (119 unit, 123 integration, 22 end-to-end) green; migrated remote +
  deployed to production. The eight real syndication sites — Great British Speakers,
  Comedians, Moderators, Musicians, Presenters, Voices, Business Speakers and Sports
  Speakers — were then seeded into the live network (idempotent `seed-network.sql`), so the
  admin now reflects the actual multi-brand estate talent will be published across.
- **23 Jul 2026** — Big-picture architecture locked with the owner (ADR 0004). The eight
  brand sites currently run on ageing WordPress; the plan is to rebuild them natively
  inside this project and have this system render them directly. The decisions: **one
  multi-tenant Cloudflare Worker renders every public site by hostname** (a new site = a
  domain + a brand row + a template module, no separate deploy); templates are bespoke per
  site while categories/topics, SEO inputs and a per-site mini-blog are managed centrally
  from the admin; which talent appears on a site stays manual curation via the publish
  action; and the publish-safe field boundary becomes a hard request-path invariant now
  that the Worker serves public traffic. A brand-new site, **Great British Influencers**
  (greatbritishinfluencers.co.uk, added to the network as the ninth site), is the
  greenfield pilot — a full public site with a net-new influencer roster — that proves the
  engine before the WordPress rebuilds begin.
- **23 Jul 2026** — Observability strategy adopted (ADR 0005), staged to the risk curve.
  Layer 0 (native, implemented same day): Cloudflare Workers Observability + source-map
  upload, so production errors are now captured with readable stack traces instead of
  vanishing into an un-sinked `console.error` — zero vendors, nothing leaving Cloudflare.
  Layer 1 (Sentry, server + React, with a mandatory publish-safe scrubber) is scheduled
  inside spec 010, to land before the first public site serves traffic. A standing rule
  came out of it: telemetry obeys the same publish-safe boundary as everything else —
  logs may carry identifiers and paths, never day rates, contacts or notes.
- **23 Jul 2026** — Spec 010 (Talent Onboarding System) built and deployed: the Onboarding
  placeholder became a real per-speaker checklist of seven steps with live progress, built to
  the client's design mockup. The defining decision was to make the checklist the *legible
  surface of the existing publish gate* rather than a parallel system — one shared
  `publishBlockers()` predicate feeds both the publish action and the checklist, so they can
  never disagree. Clarified live with the owner: only the three existing checks (headshots,
  biography, fee schedule) block publishing; completion is hybrid (derive from existing data
  where possible, manual attestation for compliance steps); travel terms are free text.
  Sensitive steps (identity, bank, safeguarding) store an attestation status with operator and
  timestamp only — never a raw passport, bank or DBS number — and no onboarding data crosses
  the publish-safe boundary. The Fee schedule step reuses the single day-rate field as its
  standard rate and adds half-day/after-dinner/travel-terms behind the day-rate permission.
  Migration 0008 kept additive (a needless full-table rebuild was avoided by moving the
  non-negative-rate checks to the service layer). Full suite: 291 automated tests (133 unit,
  133 integration, 25 end-to-end) green; the tab was visually verified against the mockup.
- **23 Jul 2026** — Spec 011 (Talent Documents) built and deployed: a per-speaker document store
  so the signed representation agreement (and any other file) can be uploaded on its onboarding
  step and gathered in a new Documents tab, with version history and delete-for-erasure. The
  request touched a deliberate spec-010 decision (attestation only, no stored PII), so the scope
  was agreed with the owner first: a general locker, files accessible on the step and in a
  Documents section, versions kept. Because the locker can hold special-category data, the
  security posture was made structural (ADR 0006): documents live in their own R2 bucket, served
  only through the authenticated Worker — never a public URL, never in publish-safe output — with
  a delete path for erasure and store-then-record ordering to avoid orphans. Derived steps offer
  no upload. Migration 0009 additive. Full suite: 306 automated tests (139 unit, 140 integration,
  27 end-to-end) green; the Documents tab and step panel were visually verified.
- **23 Jul 2026** — Spec 012 (Talent Availability) built and deployed: the Availability placeholder
  became a real per-speaker month calendar, built to the client's mockup. Four fixed states
  (available/pencilled/confirmed/blocked) shown as coloured, labelled day cells with a legend;
  add/edit/remove entries with a quick "Block dates" action; a "This month" list; and a
  default-working-week setting that de-emphasises non-working days. The month-grid and date-overlap
  logic was written as pure, exhaustively unit-tested functions in a shared module (timezone-safe
  string dates, Monday-first weeks, cell-precedence when a day has several entries). Availability is
  internal-only (never published) and independent of the speaker's overall status. Two judgment
  calls, agreed in the summary: the mockup's casual cell synonyms were standardised to the legend
  vocabulary, and Google Calendar sync was deferred to its own feature (the connect control is a
  marked "coming soon" signpost). Migration 0010 additive. Full suite: 322 automated tests (148
  unit, 147 integration, 27 end-to-end) green; the calendar was visually verified against the mockup.
