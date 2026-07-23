# 0005 — Observability & error tracking: native now, Sentry before public traffic

- **Date:** 23 Jul 2026
- **Status:** Accepted. Layer 0 (native) implemented now; Layer 1 (Sentry) scheduled for
  spec 010, before the first public site goes live.
- **Context:** The project is growing (nine specs, a real 2,244-record roster in
  production) and is about to serve **public multi-tenant traffic** across 9+ brand sites
  ([ADR 0004](0004-multi-tenant-site-engine.md)). Today, every unhandled error funnels
  through a single chokepoint (`app.onError` → `errorEnvelope`) but only does
  `console.error` with **no persistent sink**: Workers Observability was not enabled, no
  source maps were uploaded, and there was no client-side error capture. Breakage in
  production is discovered from users, not a dashboard. That is tolerable for an
  internal, Access-gated admin with a few operators; it is not once errors are
  public-facing on domains we own.

## Decision

Adopt a **two-layer** observability strategy, staged to the risk curve.

1. **Layer 0 — native Cloudflare, now (no third party).**
   - Enable `observability` in `wrangler.jsonc` (`enabled: true`, `head_sampling_rate: 1`)
     → per-request logs and unhandled errors are captured, retained and queryable in the
     Cloudflare dashboard.
   - `upload_source_maps: true` → stack traces resolve to the original TypeScript.
   - Enrich the error chokepoint to log `method + path` for triage — **never the request
     body** (it can carry publish-unsafe data).
   - This keeps the baseline 100% Cloudflare-native (aligns with [ADR 0002](0002-tech-stack.md)):
     zero new vendors, no data leaving Cloudflare, no cost.

2. **Layer 1 — Sentry, before the first public site (spec 010).**
   - `@sentry/cloudflare` wrapping the Worker at the existing `onError` chokepoint, plus
     `@sentry/react` for a client-side error boundary on the SPA.
   - Adds what native logs do not: error grouping, alerting, release health, breadcrumbs,
     and client-side (React) error capture — the signal that matters once non-technical
     staff and the public are hitting the system.
   - Free tier to start; revisit the plan only if volume demands it.
   - Deferred deliberately: it earns its keep at public launch, not before, and it is
     wired as part of the spec-010 public-engine work, not retrofitted ad hoc.

3. **Hard constraint — the publish-safe boundary applies to telemetry.** Any third-party
   tool (Sentry) must not exfiltrate internal data. A `beforeSend` scrubber that strips
   **day rates, private contact details, internal notes, and operator identities** from
   events, breadcrumbs and request context is a non-negotiable part of the Layer 1 work,
   not a follow-up. Native Layer 0 keeps data inside Cloudflare, so the same care applies
   only to what we choose to `console.log` (hence: no request bodies).

## Consequences

- Layer 0 takes effect on the next deploy; unhandled production errors are now captured
  with readable stack traces and request path context.
- Sentry is a tracked deliverable **inside spec 010** (public engine + Influencers pilot):
  SDK wiring at the `onError` chokepoint + React error boundary + the `beforeSend`
  scrubber, with the scrubber covered by a test asserting no publish-unsafe field leaves.
- Log hygiene is now a standing rule: server logs may record identifiers and paths, never
  publish-unsafe payloads — the same internal-vs-publish-safe discipline as ADR 0003/0004,
  extended to telemetry.
- Alternatives considered: **Baselime** (now folding into Cloudflare Workers Observability,
  so increasingly subsumed by Layer 0) and **Axiom** (strong log *analytics* via Logpush —
  a future option if deep log querying is wanted, not needed now). Neither displaces the
  native baseline or Sentry for error tracking.
