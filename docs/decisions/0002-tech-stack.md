# 0002 — Application tech stack: Cloudflare-native TypeScript

- **Date:** 16 Jul 2026
- **Status:** Accepted
- **Context:** Plan for spec 001 (Talent Management Module) — the first feature to require
  a stack. Constitution requires this decision be recorded with alternatives considered.

## Context

Inputs: the design system's reference components are React; hosting is Cloudflare
(`greatbritishtalent.online` already configured); scale is an internal tool (~10
operators, ~5,000 talent records) that must grow into a multi-brand admin hub; the team
operates other Cloudflare Workers projects.

## Decision

TypeScript end-to-end, deployed as **one Cloudflare Worker**:

| Layer | Choice |
|---|---|
| UI | React 19 + Vite SPA, React Router (library mode), TanStack Query |
| API | Hono on the same Worker, under `/api` |
| Domain rules | Shared TypeScript package (`app/shared/`) — enums, `TAL-` refs, GBP/date formatters, fee bands, Zod schemas |
| Database | Cloudflare D1 (SQLite) with Drizzle ORM + committed SQL migrations |
| File storage | Cloudflare R2 (talent photos), served through the Worker for auth |
| Auth (interim) | Cloudflare Access in front of the hostname; Worker verifies the Access JWT and uses the email as operator identity |
| Testing | Vitest + `@cloudflare/vitest-pool-workers`, Playwright e2e |
| CI/CD | GitHub Actions: checks on PR, `wrangler deploy` on main |
| Fonts/icons | Self-hosted Fontsource (Archivo, Public Sans, IBM Plex Mono) + `lucide-react` |

## Alternatives considered

- **Cloudflare Pages + separate API Worker** — two deployables and CORS for no benefit at
  this scale.
- **SSR frameworks (Remix/React Router framework mode, Next-on-Cloudflare)** — an
  authenticated internal admin gains nothing from SSR/SEO; adds adapter complexity.
- **Supabase/Postgres** — network hop from the Worker, extra vendor; D1 covers the scale.
  Revisit if reporting or multi-region writes demand it.
- **VPS/Node hosting** — ops burden (patching, TLS, monitoring) the Cloudflare platform
  absorbs.
- **Building first-party auth now** — out of spec scope; Cloudflare Access provides real
  per-operator identity with zero auth code, replaceable later behind the same middleware
  seam.

## Consequences

- Single deploy unit keeps ops trivial; splitting into a monorepo is deliberately
  deferred until a second deployable (e.g. a brand website) exists.
- D1's single-writer model is embraced (transactional `TAL-` counter, low write volume);
  if write contention or heavy analytics appear, the Drizzle layer is the migration seam.
- Everything brand-critical (status vocab, formats) lives in `app/shared/` — future
  websites consuming talent data should import or mirror this package, not reimplement it.
- Full per-decision rationale: `specs/001-talent-management/research.md` (R1–R12).
