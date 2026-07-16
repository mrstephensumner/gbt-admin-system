# API Contract: Talent Management Module

JSON over HTTPS, same origin as the SPA, all routes under `/api`. Authentication:
Cloudflare Access in front of the hostname; the Worker verifies the Access JWT and derives
the operator identity (research R5). Unauthenticated requests never reach the API (FR-017).

**Conventions**

- Bodies validated with the shared Zod schemas; validation failure → `400` with the
  first offending field named in `message` (sentence case, factual — FR-015).
- Error envelope: `{ "error": { "code": "<machine_code>", "message": "<operator-facing>" } }`.
- Money crosses the wire as integer pence; the UI formats via `shared/format.ts`.
- Statuses cross the wire as enum values (`on_hold`), never display labels.
- `reference` (`TAL-0481`) is the public identifier in URLs; internal `id` never appears.
- Mutations require `version` for optimistic locking where noted; stale → `409` with
  `{ error, current }` (the fresh record) so the UI can reconcile (FR-016).

## Talent

### `GET /api/talent`

Directory listing (US2). Query params (all optional, combinable — FR-007):

| Param | Type | Notes |
|---|---|---|
| `q` | string | Case-insensitive partial match on name or reference |
| `topic` | int (repeatable) | Topic id(s); AND across repeats |
| `status` | enum (repeatable) | OR across repeats |
| `band` | enum | `under_1k` · `1k_3k` · `3k_5k` · `5k_10k` · `over_10k` · `no_rate` |
| `archived` | boolean | Default `false` (active only) |
| `page` / `per_page` | int | Defaults 1 / 25, `per_page` ≤ 100 |
| `sort` | string | `name` (default) · `updated_at` · `day_rate` (± `-` prefix for desc) |

`200` → `{ items: TalentSummary[], total, page, per_page }`. `TalentSummary`: reference,
name, headline, primaryPhotoUrl (nullable → UI initials avatar), topics (id+name),
day_rate_pence, status, archived, updated_at. `total` drives "Showing X of Y speakers"
(FR-006).

### `POST /api/talent`

Create (US1). Body: name (required), headline?, biography?, day_rate_pence?, location?,
email?, phone?, topics (≥ 1: existing ids and/or new names — inline creation, FR-018).
`201` → full `Talent` with assigned `reference` and `version`. `400` on missing
name/topics.

### `GET /api/talent/:reference`

`200` → full `Talent`: all fields + topics + photos + per-brand publication state
(`[{ brand, published, published_at?, published_by? }]`) + `version`. `404` if unknown.

### `PATCH /api/talent/:reference`

Edit fields (US1). Body: any editable subset + required `version`. Topics list, when
present, replaces the set (still ≥ 1). `200` → updated `Talent`. `409` on stale version.
Reference and status are **not** editable here.

### `POST /api/talent/:reference/status`

Body: `{ status: <enum>, version }`. `200` → updated `Talent`. `400` on non-vocabulary
value (FR-005), `409` stale.

### `POST /api/talent/:reference/publish` / `POST /api/talent/:reference/unpublish`

Body: `{ brand: <slug>, version }`. Publish gates (FR-010): missing items → `422` with
`{ error: { code: "incomplete_for_publication", message: "Add a day rate before publishing" }, missing: ["day_rate", ...] }`.
Archived → `422 archived_record`. `200` → updated `Talent` with publication state.

### `POST /api/talent/:reference/archive` / `POST /api/talent/:reference/restore`

Body: `{ version }`. Archive deletes publications atomically (disclosed in UI confirm);
restore resets status to `available` (FR-012). `200` → updated `Talent`. No DELETE verb
exists anywhere on talent.

### `GET /api/talent/:reference/history`

`200` → `{ items: ChangeRecord[] }` newest-first, paginated like the directory (FR-004).

## Photos

### `POST /api/talent/:reference/photos`

`multipart/form-data`: `file` (jpeg/png/webp, ≤ 10 MB), `is_primary?`. `201` → photo
descriptor. `400` on type/size with factual message; prior state untouched.

### `DELETE /api/photos/:photoId`

`200` → remaining photos. Primary auto-reassigns to next by sort order.

### `GET /api/photos/:photoId?size=display|original`

Streams from R2 through the Worker (auth applies). `200` image body.

## Topics

- `GET /api/topics` → `{ items: [{ id, name, talent_count }] }` (talent_count powers
  merge UI confidence).
- `POST /api/topics` → create standalone (also happens inline via talent create/patch).
  Case-insensitive duplicate → `200` with existing topic (idempotent).
- `POST /api/topics/:id/rename` → `{ name }`. `409` if name collides with another topic
  (suggest merge).
- `POST /api/topics/:id/merge` → `{ into: <topic id> }`. Rewrites links, records changes,
  deletes source (FR-018). `200` → surviving topic with new talent_count.

## Brands

- `GET /api/brands` → `{ items: [{ id, slug, name }] }`. (Creation is a seed/admin
  concern, out of this feature's UI scope.)

## Meta

- `GET /api/me` → `{ email }` — the Access-derived operator identity, for UI display.
