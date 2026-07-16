# Phase 0 Research: Admin Roles & Operator Management

No stack decisions — ADR 0002 stands. These are the authorization-pattern decisions.

## R1 — Enforcement point: per-request middleware chain

- **Decision**: Extend the existing identity middleware chain. After authentication
  resolves the email, a new `authorize` middleware loads the operator row (+ grants)
  from D1 and attaches it to the request context. Unregistered email → `403
  not_registered` for every route (the registry gate, FR-003). Individual routes then
  declare needs via a `requirePermission('publish')`-style guard.
- **Rationale**: One choke point covers every existing and future endpoint (the spec's
  "enforced by the system, not hidden by the UI"); route-level guards keep the
  permission declaration next to the action it protects.
- **Alternatives considered**: checks inside each service function (scattered,
  forgettable); UI-only gating (explicitly ruled out by FR-007).

## R2 — Grants as rows, not a column

- **Decision**: `operator_grant` table — one row per (operator, permission area).
  Absence of a row = denied. Owner bypasses the table entirely (`role = 'owner'` short-
  circuits to allow).
- **Rationale**: Default-deny falls out of the data shape (FR-008: new permission areas
  need zero data migration — there are simply no rows yet). Queryable ("who can
  publish?"), auditable, and matches the project's relational style.
- **Alternatives considered**: JSON array column (opaque to SQL, easy to typo, migration
  needed if semantics change); bitmask (compact but unreadable and brittle as areas grow).

## R3 — Permission areas defined once in `shared/permissions.ts`

- **Decision**: A const array of permission area ids with labels and refusal messages
  ("You don't have permission to archive speakers — ask the owner"), plus a
  `can(operator, permission)` helper. API guards and UI gating both import it.
- **Rationale**: Constitution Principle V — exactly the same pattern as the status
  vocabulary in spec 001. UI and API cannot drift.
- **Alternatives considered**: DB-defined permission catalogue (runtime flexibility
  nobody needs; areas change only when code ships new capabilities anyway).

## R4 — Owner bootstrap: `OWNER_EMAIL` var + idempotent check

- **Decision**: Add `OWNER_EMAIL` to `wrangler.jsonc` vars. On any authenticated request,
  if the registry has no owner, the middleware registers `OWNER_EMAIL` as Owner (and, if
  the requester *is* that email, proceeds normally). Config-visible, idempotent,
  testable.
- **Rationale**: Avoids hard-coding an email in a migration (config is the right home;
  changing it before rollout is a one-line diff) and avoids the "first person in becomes
  owner" race, which would be a security hole if the Access allow-list has multiple
  emails at rollout.
- **Alternatives considered**: seed migration with the email (works, but config vars are
  where deployment identity already lives — team domain, AUD); first-authenticated-user-
  wins (race; rejected); manual SQL insert at deploy (undocumented magic).

## R5 — Field-level day-rate enforcement inside PATCH

- **Decision**: `edit_day_rates` is enforced inside the talent update service: if the
  payload's `day_rate_pence` differs from the stored value and the operator lacks the
  grant, the whole request is refused (403 with the factual message); the UI renders the
  field read-only for those operators.
- **Rationale**: Day-rate editing shares the endpoint with ordinary profile edits;
  refusing the whole request (rather than silently stripping the field) is predictable
  and honest — nothing half-applies.
- **Alternatives considered**: separate day-rate endpoint (API churn for one field);
  silent field stripping (violates least-surprise and the spec's factual-refusal rule).

## R6 — Zero grace window: no operator caching

- **Decision**: The operator row + grants are read from D1 on every request. No
  in-memory or KV caching.
- **Rationale**: SC-003 requires revocation to bite on the next request. One indexed
  read against a ≤10-row table is microseconds in D1 — well inside the ~10 ms overhead
  budget; caching would buy nothing and cost correctness.
- **Alternatives considered**: per-isolate memory cache with TTL (grace window, exactly
  what the spec forbids); embedding grants in a signed cookie (revocation lag, worse).

## R7 — Team audit as a separate append-only table

- **Decision**: `operator_audit` (actor, subject email, action, detail, at) written in
  the same D1 batch as each management mutation — the same guarded-batch pattern as
  spec 001's `change_record`. No update/delete path.
- **Rationale**: Team events are about people, not talent records — separate table keeps
  both trails clean; reusing the proven atomic-batch pattern keeps SC-006 (100%
  captured) true by construction.
- **Alternatives considered**: reusing `change_record` with a nullable talent id
  (muddies the talent history contract and its FK).

## R8 — UI gating via an operator context from `/api/me`

- **Decision**: Extend `GET /api/me` to return the full operator view
  (`{ email, role, grants }` — or `403 not_registered`). A React context provides it
  app-wide; screens hide/disable ungranted controls; router shows the blocked-access
  screen when `/api/me` returns `not_registered`.
- **Rationale**: One fetch the app already makes; keeps UI state and API truth from the
  same source. UI gating is UX only — the API remains the enforcer (R1).
- **Alternatives considered**: per-screen permission fetches (chatty); embedding grants
  at page load only without context (stale after owner changes; context + query
  invalidation handles it).
