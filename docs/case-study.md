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
  deployed to production.
