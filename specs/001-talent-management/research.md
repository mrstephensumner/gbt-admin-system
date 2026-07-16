# Phase 0 Research: Talent Management Module

All Technical Context unknowns resolved. Each decision lists rationale and alternatives.
The platform-level choices are also recorded as
[ADR 0002](../../docs/decisions/0002-tech-stack.md) per constitution requirement.

## R1 — Hosting platform: Cloudflare Workers

- **Decision**: Deploy as a single Cloudflare Worker (static assets + API) bound to
  `greatbritishtalent.online`.
- **Rationale**: The domain is already configured in Cloudflare (docs/vision.md). One
  Worker means one deploy, one log stream, no CORS (same origin for SPA and API). The
  operator team's scale is far inside Workers/D1 free-to-cheap tier. Stephen already
  operates Cloudflare Workers/Pages projects, so operational knowledge exists.
- **Alternatives considered**: Cloudflare Pages + separate Worker API (two deployables,
  CORS, no benefit at this scale); a VPS/Node host (patching and ops burden for an
  internal tool); Vercel/Netlify (fights the existing Cloudflare domain setup, D1/R2
  equivalents cost more).

## R2 — Application shape: React SPA + Hono API in one Worker

- **Decision**: Vite-built React 19 SPA served as Worker static assets; JSON API under
  `/api/*` built with Hono on the same Worker. Client routing via React Router (library
  mode); server state via TanStack Query.
- **Rationale**: The design system's reference components are React — rebuilding them in
  React is the lowest-friction path to Principle III conformance. An internal admin
  behind auth gains nothing from SSR/SEO, so a SPA avoids framework-mode complexity.
  Hono is the de-facto Workers router: tiny, typed, first-class Workers support.
- **Alternatives considered**: React Router framework mode / Remix on Workers (SSR
  complexity without an SEO or first-paint need); Next.js on Cloudflare (heavier adapter
  layer, overkill); HTMX/server-rendered (would orphan the React reference components).

## R3 — Database: Cloudflare D1 with Drizzle ORM

- **Decision**: D1 (SQLite) as the system of record; Drizzle for schema, typed queries,
  and versioned migrations committed to the repo.
- **Rationale**: 5,000 records and ~10 operators is comfortably SQLite-scale. D1 is
  native to the Worker (no connection pooling, no secrets beyond the binding). Drizzle
  migrations are plain SQL files — reviewable in PRs, satisfying Principle II. Relational
  shape (talent ↔ topics ↔ brands ↔ publications) is genuinely relational; a KV/document
  store would fake joins in code.
- **Alternatives considered**: Supabase/Postgres (network hop from the Worker, another
  vendor, more capacity than needed — revisit if/when multi-region writes or heavy
  reporting arrive); Durable Objects storage (wrong shape for ad-hoc queries/filters);
  Prisma (heavier runtime on Workers than Drizzle).

## R4 — Photo storage: Cloudflare R2

- **Decision**: Originals in R2, keyed `talent/{reference}/{photoId}`; served through a
  Worker route (`GET /api/photos/:id`) so auth applies; a display rendition (resized,
  WebP) generated on upload.
- **Rationale**: R2 has zero egress fees and binds directly to the Worker. Serving via
  the Worker keeps photos behind authentication (talent contact/PII discipline) instead
  of public-bucket URLs.
- **Alternatives considered**: Cloudflare Images (adds cost; can be adopted later purely
  as an optimisation behind the same route); base64 in D1 (bloats the database, wrong
  tool); public R2 bucket (unauthenticated leakage of roster imagery).

## R5 — Interim authentication: Cloudflare Access (satisfies FR-017 without owning auth)

- **Decision**: Put the entire hostname behind Cloudflare Access (Zero Trust) with the
  bookings team's emails allow-listed. The Worker trusts the validated
  `Cf-Access-Authenticated-User-Email` identity (verifying the Access JWT signature) and
  uses it as the Operator identity for change history (FR-004). Local dev injects a fake
  identity header.
- **Rationale**: The spec assumes sign-in "is provided separately"; Access provides real
  authentication today with zero auth code to write, test, or get wrong — and gives us
  attributable identity for free. A first-party auth feature can replace it later behind
  the same "operator identity" middleware seam.
- **Alternatives considered**: Building email/password auth now (out of spec scope,
  security-sensitive, delays the module); Basic Auth (no per-operator identity, breaks
  FR-004 attribution); third-party auth SaaS like Clerk/Auth0 (new vendor + cost for an
  interim need Access already covers).

## R6 — Reference generation: counter table, transactional

- **Decision**: A single-row `ref_counter` table; creating talent increments it and
  formats `TAL-` + zero-padded 4-digit number (growing naturally to 5 digits past 9999)
  inside one D1 transaction. References are never reused, including after archive
  (archive is soft anyway).
- **Rationale**: D1's single-writer model makes a counter race-free without extra
  machinery; a plain integer keeps FR-002 ("unique, immutable, never reused") trivially
  auditable. Zero-padding matches the design language (`TAL-0481`).
- **Alternatives considered**: MAX(reference)+1 at insert (race-prone under concurrent
  creates, and breaks if rows were ever purged); UUIDs (fails the human-usable
  operator-facing format requirement).

## R7 — Concurrent edit protection: optimistic locking (FR-016)

- **Decision**: `talent.version` integer column. Reads return it; `PATCH` must send it
  back; a mismatch returns `409 Conflict` with the current record so the UI can show
  "This record changed while you were editing" and offer a reload-and-reapply path.
- **Rationale**: Cheap, stateless, and exactly matches the spec's requirement that the
  later saver is informed rather than silently overwriting. Field-level merging is not
  needed at this team size.
- **Alternatives considered**: Last-write-wins (violates FR-016); pessimistic locks/lease
  (stateful, times out awkwardly for a small team); CRDT/live collaboration (wildly
  disproportionate).

## R8 — Directory search & filtering: SQL with indexed columns

- **Decision**: `LIKE`-based case-insensitive matching on name and reference with
  supporting indexes; filters compose as `WHERE` clauses (status, archived, topic join,
  fee band derived from `day_rate_pence` ranges); keyset-friendly `LIMIT/OFFSET`
  pagination with total count. Fee-band thresholds live in `shared/feeBands.ts` only.
- **Rationale**: At 5,000 rows, indexed SQL comfortably meets the < 2 s target (SC-003);
  correctness and simplicity beat search infrastructure. Bands-as-derivation (clarified
  in spec) means filtering by band is a rate-range predicate — no stored band column to
  drift.
- **Alternatives considered**: SQLite FTS5 (D1 support is available but adds schema
  complexity; adopt later if fuzzy/bio search is requested); external search service
  (unjustifiable at this scale).

## R9 — Change history: append-only audit table (FR-004)

- **Decision**: `change_record` rows written in the same transaction as every mutation
  (field edits with old/new values, status changes, publication changes, archive/
  restore, photo changes, topic merges touching the record). Read-only once written; no
  update/delete path exists in the API.
- **Rationale**: Same-transaction writes make attribution complete by construction
  (SC-006's "100% attributable"). A table (vs. log stream) keeps history queryable on
  the profile screen as the spec requires.
- **Alternatives considered**: Worker logs/analytics as audit trail (not queryable per
  record, retention limits); event-sourcing the whole model (powerful but a large
  architectural bet the module doesn't need).

## R10 — Design-system port: tokens verbatim, fonts and icons self-hosted

- **Decision**: Copy `design-system/tokens/*.css` into `app/src/styles/` unmodified
  (single import, as the handoff prescribes). Self-host the three font families via
  Fontsource packages (`@font-face`, replacing the Google Fonts `@import`) and use
  `lucide-react` instead of the CDN script.
- **Rationale**: Principle III demands token fidelity — copying verbatim keeps a clean
  diff against the handoff. Self-hosting removes third-party requests from an
  authenticated admin (privacy, offline-ish resilience, no CDN wobble) while keeping the
  exact same typefaces the handoff specifies as stand-ins. `lucide-react` is the same
  icon set the handoff mandates, tree-shaken instead of CDN-loaded.
- **Alternatives considered**: Keeping Google Fonts/unpkg CDN links (external calls from
  an internal tool, a flagged handoff caveat); swapping icon sets (violates the design
  system).

## R11 — Testing stack: Vitest + vitest-pool-workers + Playwright (Principle VI)

- **Decision**: Unit tests with Vitest — exhaustive over `shared/` (enums, reference
  format, formatters, fee bands). API integration tests run inside the Workers runtime
  via `@cloudflare/vitest-pool-workers` against a migrated in-memory D1, covering every
  endpoint including 409/gating/archive paths. Playwright drives the five user-story
  journeys against `wrangler dev` with seeded data (incl. a 5,000-record seed for the
  SC-003 timing check).
- **Rationale**: Constitution VI requires risk-proportional tests plus a real
  run-through; vitest-pool-workers tests the actual runtime instead of Node mocks;
  Playwright maps 1:1 onto the spec's independent-test definitions.
- **Alternatives considered**: Jest (weaker Workers story); mocking D1 in Node (tests a
  runtime we don't ship); Cypress (Playwright's Workers/CI ergonomics are better here).

## R12 — CI/CD: GitHub Actions → Wrangler deploy

- **Decision**: GitHub Actions on PR: typecheck, lint, unit + integration tests, build.
  Playwright e2e on PR to `main`. Deploy to production via `wrangler deploy` on `main`
  merge (after the domain is attached; until then, `workers.dev` preview URL).
- **Rationale**: Keeps Principle VI's "failing check blocks merge" mechanical, and
  Principle II's "repo is the record" extends to deploy history via Actions logs.
- **Alternatives considered**: Cloudflare Workers Builds (fine, but Actions keeps test +
  deploy in one visible pipeline next to the repo); manual deploys (unauditable).
