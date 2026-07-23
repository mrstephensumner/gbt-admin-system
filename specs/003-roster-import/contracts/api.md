# API Contract: Roster Import from File

Extends the existing API; same conventions. **Every endpoint requires the
`import_roster` permission** (403 `forbidden` with the shared refusal message otherwise;
registry gate applies as everywhere).

## `POST /api/import/runs`

Body: `{ file_name, dry_run?: boolean, rows: NormalisedRow[] }` — rows come from the
browser-side parser; the server re-validates each against the shared schema and applies
column-level rules (required source_id/name, money parsing, duplicate detection).

`200` →

```json
{
  "run_id": 7,
  "dry_run": true,
  "rows_found": 1284,
  "rows_clean": 1270,
  "rows_problem": 14,
  "problems": [{ "row": 12, "reason": "Row has no talent identifier" }],
  "staged_new": 0,
  "refreshed": 0,
  "untouched_imported": 0,
  "untouched_skipped": 0
}
```

With `dry_run: false` the same shape reports actual staging effects. Rows > 10,000 or
payloads > 25 MB → `400`.

## `GET /api/import/runs`

Recent transfers: `{ items: [{ id, file_name, operator, at, rows_found, rows_staged, rows_problem, dry_run }], total, page, per_page }` newest first.

## `GET /api/import/candidates`

Query: `status` (default `new`), `q` (name search), `page`, `per_page`.
`200` → `{ items: Candidate[], total, page, per_page }` where Candidate exposes all
captured fields + `gaps`, `duplicate_of`, `status`, `talent_reference`.

## `PATCH /api/import/candidates/:id`

Edit captured fields before approval (same field rules as talent create; `400` with a
factual message on violations). Only `new` candidates are editable → `422
not_reviewable` otherwise.

## `POST /api/import/candidates/:id/skip`

Marks skipped (permanent). `200` → updated candidate. Only from `new` → else `422`.

## `POST /api/import/approve`

Body: `{ ids: number[] }` — **max 25** (`400` above). Each id: candidate must be `new`;
creates a talent record via the spec-001 creation rules (fresh `TAL-` reference, topics
inline, status Available, unpublished, history `created` with import attribution), then
fetches the photo (failure → created without photo, gap noted).

`200` →

```json
{
  "results": [
    { "id": 4, "ok": true, "talent_reference": "TAL-0121" },
    { "id": 9, "ok": false, "reason": "Add at least one topic" }
  ]
}
```

Per-candidate failures never abort the chunk (FR-008).

## `DELETE /api/import/candidates`

Clears staging: deletes `new` candidates only — `imported`/`skipped` rows survive
(FR-009/014). `200` → `{ deleted: n }`.

## Contract test expectations

- All endpoints 403 without `import_roster`; owner passes.
- Dry-run writes nothing (candidate count unchanged, run recorded with dry_run=1).
- Upsert semantics: re-upload refreshes `new`, never touches `imported`/`skipped`;
  duplicate source_id within one payload → problem row.
- Approval creates through the standard path: reference allocated, unpublished, history
  attributed; a second approval attempt on the same candidate → `422`.
- Existing talent rows are never UPDATEd by any import endpoint (verified by
  version/updated_at stability on a pre-existing record across a full import cycle).
