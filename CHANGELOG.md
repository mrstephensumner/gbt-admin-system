# Changelog

All notable changes to the GBT Admin System are documented here, newest first.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates are day-month-year.

## [Unreleased]

### Added
- **Talent Onboarding System (spec 010)** — the Onboarding placeholder is now a real
  per-speaker checklist of seven fixed steps (representation agreement, identity & right to
  work, bank & payment details, headshots & showreel, biography & topics, fee schedule,
  safeguarding & compliance) with a live progress summary and a step-detail panel, built to
  the design mockup. The checklist is the **legible surface of the existing publish gate** —
  a single shared `publishBlockers()` feeds both the publish action and the checklist's
  blocking flags, so they can never disagree (the three publish-required steps map 1:1 to
  today's day-rate/biography/photo checks; representation agreement is tracked but does not
  block publishing, per owner clarification). Completion is **hybrid**: headshots, biography
  and fee schedule derive from existing data; the compliance steps are manual attestations.
  **Sensitive steps store attestation only** — a verified status with the attesting operator,
  timestamp and an optional internal note; there is deliberately no field for a raw passport,
  bank or DBS number, and no onboarding data enters any publish-safe serialization. The Fee
  schedule step captures standard/half-day/after-dinner rates (standard rate reuses the single
  existing day-rate field), free-text travel terms and a "fees vary by site" flag, all behind
  the `edit_day_rates` permission. Steps can be marked not-applicable; every change is
  attributed and flows into History, the dashboard feed and Statistics. Migration 0008
  (additive: new `talent_onboarding_step` table + fee columns). Suites: 133 unit + 133
  integration + 25 e2e green; visually verified against the mockup.
- **Observability — Layer 0 (ADR 0005)** — native Cloudflare Workers Observability turned
  on (`observability.enabled`, source-map upload), so per-request logs and unhandled
  errors are now captured, retained and queryable in the dashboard with readable
  TypeScript stack traces — previously they hit a `console.error` with no persistent sink.
  The error chokepoint now logs request method + path for triage (never the body, to hold
  the publish-safe boundary). Zero new vendors, no data leaves Cloudflare. Sentry (server +
  React, with a publish-safe scrubber) is scheduled as Layer 1 inside spec 010, before the
  first public site goes live. Deployed.
- **Publishing Network (spec 009)** — the network of brand sites is now managed in the
  admin, making it the true backbone for the 7+ external websites. A new **Network**
  screen (owner + `network` permission) lists every site with its live published-talent
  count and lets you add sites (immutable slug auto-derived from the name, https URL) and
  edit/deactivate them — deactivate-not-delete, so an inactive site keeps its
  publications and public-API integrity. The profile's **Site selector** tab is renamed
  **Network** and shows where a speaker is published across the whole network; sites the
  speaker is already published to always appear even if later deactivated. Publishing to
  one site is fully independent of the others. New `network` permission (owner
  auto-holds), surfaced automatically in the Team grant grid. Migration 0007
  (brand `url`/`active`/`sort_order`). Suites: 119 unit + 123 integration + 22 e2e green;
  migrated remote + deployed to production. Repo hygiene: `.wrangler/` local dev state
  (D1 SQLite + R2 blobs) removed from version control and gitignored.
- **Real syndication network seeded** — the eight live Great British Talent brand sites
  (Speakers, Comedians, Moderators, Musicians, Presenters, Voices, Business Speakers,
  Sports Speakers) are now in the network, each with its public URL. Idempotent
  `worker/db/seed-network.sql` (+ `seed:network` / `seed:network:remote` scripts); applied
  to production and local. Kept separate from the e2e brand seed so count-based tests stay
  deterministic.
- **Multi-tenant site engine architecture locked (ADR 0004)** — the delivery mechanism
  left open in ADR 0003 is now settled: this same Cloudflare Worker will **render every
  public brand site by hostname** (add a domain + brand row → live, no per-site deploy).
  Templates are bespoke per site; categories/topics, SEO inputs and a per-site mini-blog
  are admin-managed and shared; talent→site stays manual curation via the publish action;
  the publish-safe boundary becomes a request-path invariant. **Great British Influencers**
  (greatbritishinfluencers.co.uk, added to the network) is the greenfield pilot that
  proves the engine before the eight WordPress sites are rebuilt onto it. Roadmap: public
  engine + Influencers pilot → per-site category/SEO manager → per-site blog → Enquiries
  module → WordPress rebuilds.
- **Talent Media Manager (spec 008)** — the Photos tab is now a full media manager:
  categorised **headshots** and **at-event photos**, **showreels** (external video links
  with provider + thumbnail derived from the URL), and an **SEO metadata** sidebar (meta
  title, description, focus keyword with live search-snippet length guides). Full
  editing controls (per owner clarification): choose which headshot is the avatar,
  caption photos, drag to reorder photos and showreels, edit showreel titles. The avatar
  is always a headshot, never an event photo. Migrations 0005 + 0006. Suites: 118 unit +
  117 integration + 20 e2e green; deployed to production. Also restored the Site selector
  tab (accidentally dropped during an edit) and recorded ADR 0003 (multi-site content
  delivery) + the living project case-study log (docs/case-study.md).
- **Social & News (spec 007)** — the placeholder tab is now real: social profiles
  (fixed platform vocabulary, https-validated links, optional handle, follower counts
  with attributed "as of" stamps that restamp on update) with total recorded reach, and
  a press/news mentions log ordered newest-first by publication date. Add/remove of
  links and mentions flow into History, the dashboard feed, and Statistics; follower
  updates are attributed on the row. Migration 0004; new shared `social` module.
  Automated follower sync and news discovery deliberately deferred (FR-007 — need
  platform API integrations; these structures are their landing place). Suites 107 unit
  + 107 integration + 18 e2e green; deployed to production. Three of the four
  profile-tab placeholders now built (Onboarding remains).
- **Internal talent notes (spec 006)** — a Notes tab on every speaker workspace (live
  count on the tab): plain-text notes with permanent author + day-month-year timestamp,
  newest-first, paginated, append-only, allowed on archived records, internal-only.
  Each note also writes a `note_added` change record, so History, the dashboard
  activity feed, and Statistics count it. Migration 0003. Suites 79 unit +
  100 integration + 18 e2e green; deployed to production.
- **Roadmap placeholders** (spec 005 clarification — owner decision for the client
  demo): the four unbuilt profile tabs (Onboarding, Availability, Social & News,
  Profile Enrichment) and four future modules (Enquiries, Bookings, Clients, Invoices —
  sidebar entries marked "Soon") now render as designed "In development" panels with a
  factual purpose and planned-capabilities list, no interactive controls. Each remains
  a future spec. e2e asserts placeholders are marked and control-free. Deployed.
- **Talent Profile Workspace (spec 005)** — the profile is now the mockup's tabbed
  workspace: Profile · Photos · Site selector (the per-brand publication engine,
  renamed per the mockup) · Statistics · History, deep-linkable via ?tab=. New
  Statistics tab computed entirely from existing records: publication + extended
  completeness checklists (shared gate definition), exact activity counts (all-time /
  last 30 days, by kind), and profile facts (created/updated/attribution, status with
  since-date, topics/photos/brand counts). Mockup tabs without underlying features
  (Onboarding, Availability, Social & News, Profile Enrichment) deliberately not
  rendered — each awaits its own spec (vision backlog). Suites 79 unit + 95 integration
  + 18 e2e green; deployed to production.
- **Real-roster readiness** (evening before the client demo): WordPress WXR converter
  (`scripts/convert-wp-export.py`) turning the greatbritishtalent.com export (2,244
  published profiles under the `news` post type, with about_speaker bios, categories as
  topics, and thumbnail photo URLs) into an Import-ready CSV — verified end-to-end
  locally: 2,244/2,244 rows validate clean, staging in 0.3 s, sample approvals fetch
  real photos from the live site. Fixed a scale bug found by the real data (duplicate-
  name flagging ran one query per row — would exceed request limits at roster size; now
  a single upfront query). Added an "Approve all new" button with a self-terminating
  loop (failed candidates excluded and left for review) so a 2,244-record approval is
  one click. Suites 79/91/17 green; deployed to production.
- **Operations Dashboard (spec 004)** — new landing screen: live KPI tiles (active
  speakers, per-status, published per brand, topics) deep-linking to the filtered
  directory; Ready-to-publish and Blocked-from-publishing attention lists sharing the
  publication gate's completeness definition; attributed recent-activity feed over the
  existing change history; purposeful empty state pointing to Add speaker / Import.
  Directory moved to /speakers. 6 new integration tests (KPI ↔ directory count
  equality) + 2 e2e journeys; suites now 79 unit + 91 integration + 17 e2e, all green.
  Deployed to production 16 Jul 2026.
- **Spec 003 implementation** under `app/`: browser-side file parsing (CSV via
  papaparse, XLSX via SheetJS official CDN build 0.20.3 — npm's stale xlsx package and
  its advisories avoided, JSON native); dry-run validation sharing the staging code
  path; import_candidate/import_run tables (migration 0002); tolerant column-synonym
  mapping with visible unmapped-column reporting; conservative GBP parsing (gaps, never
  guesses); staged review screen (edit/skip/bulk-approve with chunked progress, clear
  staging); approval through the spec-001 creation rules with import-marked history and
  approval-time photo fetch into R2; idempotent re-uploads keyed by source talent id;
  permanent skip memory; new `import_roster` permission area (first exercise of spec
  002's default-deny extension — Team screen toggle appeared automatically). Suites:
  79 unit + 85 integration + 15 e2e, all green, e2e verified repeat-safe; Import screen
  visually verified against the owner's mockup. Deployed to production 16 Jul 2026
  (migration 0002 applied remotely; gates verified). The live import run awaits the
  real back-office export file.
- Implementation plan for spec 003 (`specs/003-roster-import/plan.md`): research R1–R8
  (browser-side parsing, dry-run validation, JSON-detail staging table, approval-time
  photo fetch, new import_roster permission area, tolerant column-synonym mapping,
  conservative money parsing, chunked bulk approval), data model (import_candidate,
  import_run), import API contract, quickstart with fixture-file strategy. Constitution
  Check passes all six gates.
- Spec 003 revised same day: source changed from website crawl to owner-provided export
  file (CSV/XLSX/JSON) with validate-before-import, per the owner's design mockup;
  add-new-only mode locked for v1; mockup-revealed future modules recorded in
  `docs/vision.md` backlog.
- Spec 003 — Roster Import from Great British Speakers
  (`specs/003-roster-import/spec.md`): staged import of the old site's public speaker
  profiles (candidates → human review/edit → approve into talent records), reconciling
  run summaries, idempotent re-runs keyed by source page, duplicate flagging,
  seed-not-sync guarantee, and a new import permission area. Quality checklist passes
  in full.

## 16 Jul 2026 — Admin Roles & Operator Management (spec 002) · v0.2.0

### Added
- **Spec 002 implementation** under `app/`: operator registry with single-Owner
  invariant and `OWNER_EMAIL` bootstrap; per-request authorization middleware (registry
  gate on every endpoint, reads included; zero-grace-window revocation); permission
  grants (`edit_day_rates` incl. field-level PATCH enforcement, `publish`, `archive`,
  `manage_topics`) enforced at the API with UI hiding/disabling to match; Owner-only
  Team screen (add/remove operators, grant toggles, append-only team audit trail);
  blocked-access screen for signed-in but unregistered identities. Migration
  0001_operators. Suites: 57 unit + 72 integration + 13 e2e, all green; screens
  visually verified. Deployed to production 16 Jul 2026 with OWNER_EMAIL=hello@localseo.agency; owner sign-in confirmed live by Stephen (owner bootstrap + Team screen working).
- Implementation plan for spec 002 (`specs/002-admin-roles/plan.md`) with authorization
  research R1–R8 (per-request middleware gate, grants-as-rows default-deny, shared
  permissions module, OWNER_EMAIL bootstrap, field-level day-rate enforcement, zero-
  grace-window revocation, append-only team audit), data model (operator,
  operator_grant, operator_audit), team API contract, and quickstart. Constitution Check
  passes all six gates; no new stack decisions (ADR 0002 stands).
- Spec 002 — Admin Roles & Operator Management (`specs/002-admin-roles/spec.md`): three
  prioritised user stories (registry gate for signed-in users, Owner-managed team screen,
  per-operator permission grants enforced server-side), 12 functional requirements
  (single Owner invariant, default-deny for future permission areas, permanent
  attribution, team audit trail), measurable success criteria, and assumptions. Quality
  checklist passes in full.

## 16 Jul 2026 — Talent Management Module (spec 001) · v0.1.0

### Added
- **greatbritishtalent.online is LIVE** (16 Jul 2026): custom domain bound to the
  Worker; Cloudflare Access enforcing the Bookings Team allow-list at the edge (one-time
  PIN + Cloudflare login methods) with the Worker independently verifying the Access JWT
  (401 without it). Operator sign-in verified end-to-end. T046 complete — all 47 tasks
  of spec 001 done. `.dev.vars` (gitignored) keeps local dev on the fake identity.
- **First production deployment** (16 Jul 2026): D1 database `gbt_admin`
  (003ddb66…) and R2 bucket `gbt-photos` created; schema migrated; Great British
  Speakers brand seeded; Worker deployed to
  https://gbt-admin.stephen-a8b.workers.dev and smoke-tested (T046 in progress —
  custom domain + Cloudflare Access still to be configured).
- `/speckit-analyze` remediation: integration tests for the production Cloudflare Access
  branch (`app/tests/integration/auth.test.ts` — missing/forged assertion rejected, dev
  header cannot bypass configured Access, dev fallback intact); config guard rejecting
  half-configured Access (domain without AUD → explicit `access_misconfigured` error);
  `scripts/activate-ci.sh` one-command CI activation once the git token has `workflow`
  scope; first-deploy smoke check added to `docs/deployment.md`; research.md R4 wording
  aligned with the client-side rendition implementation. Integration suite now 48 tests.
- **Application implementation (spec 001, phases 1–7 core)** under `app/`: Cloudflare
  Worker (Hono API + React 19 SPA), D1 schema with migration, shared domain package
  (status enums, `TAL-` references, GBP/date formatters, derived fee bands, Zod schemas),
  full talent API (create/edit with optimistic locking, directory search/filters,
  status, per-brand publication gating, archive/restore, photos via R2, topics
  rename/merge, append-only change history), all four screens (directory, add speaker,
  profile, topics) built on rebuilt design-system components with verbatim tokens and
  self-hosted fonts. 44 unit tests + 42 integration tests + 10 Playwright journeys green;
  SC-003 perf check passes at 5,000 records (~0.7 s); screens visually verified against
  the design system in the browser. Typecheck and lint clean.
- `docs/deployment.md` — Cloudflare setup (D1/R2 creation, deploy, custom domain) and
  Cloudflare Access configuration for interim authentication. Deploy itself pending
  interactive `wrangler login` (tasks.md T046).
- CI workflow parked at `docs/ci/github-workflow-ci.yml` — the git token lacks the
  `workflow` scope needed to push `.github/workflows/`; activation steps in
  `docs/ci/README.md`.
- README updated with app run/test instructions; tasks.md marked 46/47 complete.
- Task breakdown for spec 001 (`specs/001-talent-management/tasks.md`): 47 tasks across
  8 phases (setup, foundational shared-domain/schema/shell, one phase per user story,
  polish incl. topic management and deploy preview), with dependency graph, parallel
  tracks, and MVP cut at Phase 3 (US1).
- Implementation plan for spec 001 (`specs/001-talent-management/plan.md`) with Phase 0
  research (R1–R12), data model (8 tables incl. append-only change history and
  publication join), JSON API contract, and quickstart validation guide. Constitution
  Check passes all six gates, pre- and post-design.
- ADR 0002 (`docs/decisions/0002-tech-stack.md`): Cloudflare-native TypeScript stack —
  React 19 + Vite SPA and Hono API on one Worker, D1 + Drizzle, R2 photos, Cloudflare
  Access as interim auth, Vitest + Playwright, GitHub Actions CI/CD. `docs/vision.md`
  open questions updated accordingly.
- Hosting decision input recorded in `docs/vision.md`: the admin will be served from
  **greatbritishtalent.online**, already configured in Cloudflare (16 Jul 2026).
- Spec 001 — Talent Management Module (`specs/001-talent-management/spec.md`): five
  prioritised user stories (add/maintain records, directory search at 5,000-record scale,
  fixed-vocabulary status tracking, per-brand publication with completeness gating,
  archive-not-delete), 19 functional requirements, key entities, measurable success
  criteria, and assumptions. Quality checklist passes in full
  (`specs/001-talent-management/checklists/requirements.md`).
- Spec 001 clarifications (session 16 Jul 2026): neutral `TAL-NNNN` references for all
  talent (supersedes the mockups' `SPK-`), hybrid topic governance (inline creation +
  central rename/merge, FR-018), and fee bands derived from day rate via fixed thresholds
  (FR-019).

## 16 Jul 2026 — Constitution v1.0.0 ratified

### Added
- Project constitution (`.specify/memory/constitution.md`) v1.0.0 with six core principles:
  spec-driven development, repository as documentation of record, design-system conformance,
  one source of truth / multi-brand from the start, operational-not-promotional, and
  verified-before-merged — plus Brand & Content Standards, Development Workflow & Quality
  Gates, and Governance (semantic versioning, amendment procedure, compliance review).

## 16 Jul 2026 — Project foundation

### Added
- Repository initialised from the new GitHub repo `mrstephensumner/gbt-admin-system`.
- **GitHub spec-kit** initialised (`specify init --here --integration claude`) — adds
  `.specify/` (templates, constitution scaffold, workflow scripts) and `.claude/skills/`
  (`/speckit-*` skills for spec-driven development in Claude Code).
- **Design system imported** to `design-system/` from the Claude Design handoff
  ("Great British Talent — Admin Design System"): CSS tokens, 22 React component
  references, interactive admin UI kit (Dashboard, Speakers, Speaker profile, Enquiries),
  Talent Management Module screen, brand logo assets, and full content/visual guidelines.
- `README.md` — project overview, repository layout, spec-driven workflow.
- `docs/` — documentation home with architecture notes and decision records
  (`docs/decisions/0001` records the spec-kit adoption).
- `CLAUDE.md` — working agreements for Claude Code sessions (changelog + docs discipline,
  spec-kit workflow, design-system conformance).
- `.gitignore` for a Node/JS project.
