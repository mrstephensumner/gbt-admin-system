# API Contract: Admin Roles & Operator Management

Extends the spec-001 API. Same conventions (error envelope, sentence-case factual
messages, JSON over same-origin `/api`).

## Authorization semantics (applies to every endpoint)

- **Registry gate**: any request from an authenticated email with no operator record →
  `403 { error: { code: "not_registered", message: "You don't have access yet — ask the owner to add you" } }`.
  Applies to all reads and writes, including spec-001 endpoints.
- **Permission refusal**: a gated action without the grant →
  `403 { error: { code: "forbidden", message: "<factual message from shared/permissions.ts>" }, permission: "<area id>" }`.
- **Owner-only**: all `/api/team/*` endpoints require `role = owner` → otherwise `403 forbidden`.

### Newly gated existing endpoints

| Endpoint | Requirement |
|---|---|
| `PATCH /api/talent/:reference` with a changed `day_rate_pence` | `edit_day_rates` (whole request refused, nothing half-applies) |
| `POST /api/talent/:reference/publish` / `unpublish` | `publish` |
| `POST /api/talent/:reference/archive` / `restore` | `archive` |
| `POST /api/topics/:id/rename` / `merge` | `manage_topics` |
| Everything else from spec 001 | registered operator (baseline) |

## Changed endpoint

### `GET /api/me`

Now returns the operator view: `200 { email, role: "owner"|"operator", grants: ["publish", …] }`
(owner's `grants` lists every area, for UI simplicity). Unregistered → `403 not_registered`.

## New endpoints (owner-only)

### `GET /api/team/operators`

`200 { items: [{ id, email, role, grants: [...], added_at, added_by }] }` — active
operators, owner first, then by email.

### `POST /api/team/operators`

Body `{ email }`. Registers an operator with no grants. Case-insensitive duplicate →
`200` with the existing operator (idempotent, FR-011). Invalid email → `400`. `201` on
create. Audits `operator_added`.

### `DELETE /api/team/operators/:id`

Removes an operator and their grants (same batch); history and audit remain. Attempting
to remove the owner → `422 { error: { code: "owner_invariant", message: "The owner cannot be removed" } }`.
`200 { items: [...] }` (fresh list). Audits `operator_removed`.

### `PUT /api/team/operators/:id/grants`

Body `{ grants: ["publish", "archive", …] }` — the full desired set (idempotent
replace; additions and revocations derived by diff, each audited). Unknown area id →
`400`. Targeting the owner → `422 owner_invariant`. `200` → updated operator.

### `GET /api/team/audit`

`200 { items: [{ id, actor, subject_email, action, detail, at }], total, page, per_page }`
— newest first, paginated. Append-only; no mutation endpoints exist.

## Contract test expectations

- Every gated endpoint refuses without the grant and succeeds with it (full matrix).
- Registry gate covers a sample of every route family, reads included.
- Owner invariant paths: remove owner, edit owner grants, add a second owner (impossible
  by API shape — no role parameter exists on create).
- Revocation applies to the immediately following request (no caching).
