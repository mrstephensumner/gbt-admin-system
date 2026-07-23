# API Contracts: Talent Availability

Under the Access-gated admin API, registered operators. Error envelope `{ error: { code, message } }`.

## GET `/api/talent/:reference/availability?month=YYYY-MM`

Entries overlapping the given month (default: current month) + the working week.

**200**:
```json
{
  "entries": [
    { "id": 5, "state": "confirmed", "title": "Barclays Events", "detail": "Keynote",
      "location": "London", "start_date": "2026-08-12", "end_date": "2026-08-12",
      "updated_by": "jo@…", "updated_at": "2026-07-23T10:00:00Z" },
    { "id": 6, "state": "blocked", "title": "Annual leave", "detail": null, "location": null,
      "start_date": "2026-08-18", "end_date": "2026-08-19" }
  ],
  "working_week": "mon_fri"
}
```

## POST `/api/talent/:reference/availability`

Create an entry.

**Request**:
```json
{ "state": "blocked", "title": "Annual leave", "detail": null, "location": null,
  "start_date": "2026-08-18", "end_date": "2026-08-19" }
```
- `state` ∈ available|pencilled|confirmed|blocked; `title` required; `detail`/`location` optional.
- **201**: the created entry.
- Errors: `400 bad_state`; `400 missing_title`; `422 bad_range` (end before start); `404 not_found`.
- Writes an `availability_added` change record (`field` = title).

## PATCH `/api/talent/:reference/availability/:id`

Edit an entry (partial). Same validation. **200** the updated entry. `availability_updated` record.

## DELETE `/api/talent/:reference/availability/:id`

Remove an entry. **200** `{ ok: true }`. `availability_removed` record (`field` = title). `404` if none.

## PATCH `/api/talent/:reference/availability/settings`

Set the working week.

**Request**: `{ "working_week": "mon_fri" }` (∈ mon_fri|mon_sat|all).
**200**: `{ working_week }`. `400 bad_working_week` otherwise. Writes a `working_week_changed` record.

## Publish-safe exclusion (FR-010 / SC-005)

No availability entry or working-week value appears in any publish-safe/public serialization of a
speaker. Enforced by an integration guard test.
