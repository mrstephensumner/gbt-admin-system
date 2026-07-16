# Data Model: Roster Import from File

Two new D1 tables (migration `0002_import`); no changes to existing tables. Conventions
as before. Both tables are operational staging — clearable without touching the roster.

## Entities

### import_candidate

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | |
| source_id | text | UNIQUE COLLATE NOCASE, NOT NULL | Old system's talent identifier (FR-010 key) |
| name | text | NOT NULL | |
| headline | text | nullable | |
| biography | text | nullable | |
| topics_json | text | NOT NULL default '[]' | JSON array of topic names |
| day_rate_pence | integer | nullable | From conservative money parse (R7) |
| location | text | nullable | |
| email | text | nullable | |
| phone | text | nullable | |
| photo_url | text | nullable | Fetched at approval (R4) |
| gaps_json | text | NOT NULL default '[]' | JSON array of gap notes (e.g. "day rate unreadable: 'POA'") |
| duplicate_of | text | nullable | `TAL-…` reference of the name-matched record (FR-012) |
| status | text | NOT NULL, CHECK in ('new','imported','skipped') | |
| talent_reference | text | nullable | Set on approval |
| first_seen_at / updated_at | text | NOT NULL | |
| decided_at / decided_by | text | nullable | Approval or skip attribution |

Indexes: unique `source_id COLLATE NOCASE`; `status`.

**Lifecycle rules (service layer, tested)**:
- Staging upserts by `source_id`: refreshes rows still `new`; never touches `imported`
  or `skipped` (FR-010).
- `Clear staging` deletes only `status = 'new'` rows — skip memory and import links
  survive (FR-009/014).
- Approval reads the candidate, calls the spec-001 create path (never an update — FR-011
  by construction), records `talent_reference`, flips status to `imported`.

### import_run

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | |
| file_name | text | NOT NULL | As uploaded |
| operator | text | NOT NULL | Who ran it |
| at | text | NOT NULL | |
| rows_found | integer | NOT NULL | |
| rows_staged | integer | NOT NULL | New + refreshed |
| rows_problem | integer | NOT NULL | |
| problems_json | text | NOT NULL default '[]' | [{ row, reason }] — capped list, count always exact |
| dry_run | integer (bool) | NOT NULL default 0 | Validation-only runs are recorded too |

The recent-transfers panel is this table, newest first. Append-only in practice (no
update/delete endpoints).

## Shared vocabulary (`shared/importing.ts`)

- `CANDIDATE_STATUSES = ['new','imported','skipped']` + labels/badge tones.
- `NormalisedRow` schema (Zod): `source_id` + `name` required; other fields optional;
  raw money strings carried for server-side parsing.
- Column synonym map (R6) with `mapHeaders(headers) → { mapping, unmapped }`.
- `parseGbpToPence(raw) → number | null` (R7) — null means gap, never a guess.

## State transitions

```text
(file row) ──validate──▶ clean | problem(reason)
clean ──stage──▶ candidate(new)            [upsert by source_id; imported/skipped immune]
candidate(new) ──edit──▶ candidate(new')   [candidate only; roster untouched]
candidate(new) ──approve──▶ talent record created (spec-001 path) + candidate(imported)
candidate(new) ──skip──▶ candidate(skipped)     [permanent, survives clears & re-uploads]
candidate(new) ──clear staging──▶ (deleted)
imported/skipped ──(any import action)──▶ unchanged
```
