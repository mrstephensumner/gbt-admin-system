# Implementation Plan: Operations Dashboard

**Branch**: `004-dashboard` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-dashboard/spec.md`

## Summary

One read-only aggregation endpoint (`GET /api/dashboard`) and one screen. Counts come
from SQL aggregations (never record fetches); attention lists reuse the spec-001
publication-gate definitions; the activity feed joins the existing change history to
talent names. The dashboard takes the root route; the directory moves to `/speakers`.
No new tables, no new permissions (baseline registered-operator read, FR-006), no new
dependencies — this is presentation over specs 001–003's data.

## Technical Context

**Language/Version**: TypeScript 5.x (extends existing `app/`) · **Dependencies**: none
new · **Storage**: no schema changes · **Testing**: integration tests proving KPI ↔
directory-count equality and attention-list correctness; e2e journey for the landing
experience incl. tile-link filters; SC-002 timing bound by existing indexes ·
**Platform/Scale**: as before; one endpoint, one screen, nav + route updates

## Constitution Check

| # | Principle | Status |
|---|-----------|--------|
| I | Derives from approved spec 004 | ✅ |
| II | CHANGELOG/docs in same commits; no new decisions needing an ADR | ✅ |
| III | Built from existing StatCard/Card/Badge/Table components per the handoff's Dashboard screen; no new tokens | ✅ |
| IV | Per-brand tiles iterate the brand table — nothing hard-coded | ✅ |
| V | Status/labels/tones and gate definitions imported from shared modules; activity descriptions reuse the profile history vocabulary | ✅ |
| VI | Count-equality integration tests + e2e journey + 5k timing check | ✅ |

**Post-design re-check**: endpoint is read-only (no mutations exist on it); route change
covered by updated e2e specs. ✅ — *Complexity Tracking empty.*

## Design

### Contract — `GET /api/dashboard` (baseline permission)

```json
{
  "counts": {
    "active": 1284,
    "by_status": { "available": 900, "on_hold": 120, "booked": 150, "confirmed": 80, "cancelled": 34 },
    "published": [{ "brand": "great-british-speakers", "brand_name": "Great British Speakers", "count": 3 }],
    "topics": 42
  },
  "attention": {
    "ready_to_publish": { "items": [{ "reference": "TAL-0001", "name": "…", "updated_at": "…" }], "total": 9 },
    "blocked": { "items": [{ "reference": "TAL-0002", "name": "…", "missing": ["day_rate", "photo"] }], "total": 41 }
  },
  "activity": [{ "reference": "TAL-0001", "name": "…", "actor": "…", "action": "published", "field": "publication", "old_value": null, "new_value": "great-british-speakers", "at": "…" }]
}
```

Attention lists capped at 6 items each (+true totals); activity capped at 12. "Complete"
= day_rate > 0 AND biography non-empty AND ≥1 photo — the same predicate as the
publication gate (shared definition, Principle V).

### Structure

```text
app/worker/services/dashboard.ts   # aggregation queries
app/worker/routes/dashboard.ts     # GET /api/dashboard
app/src/routes/dashboard.tsx       # screen: StatCards grid, attention Cards, activity feed
app/src/main.tsx / root.tsx        # '/' → Dashboard; '/speakers' → Directory; nav updated
tests/integration/dashboard.test.ts
tests/e2e/us-dashboard.spec.ts     # + existing e2e specs updated for /speakers
```

Directory tile-links: `/speakers?status=on_hold` etc. — the directory already reads its
filters from the URL, so deep-linking is free.
