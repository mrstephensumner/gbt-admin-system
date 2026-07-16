# Data Model: Talent Management Module

D1 (SQLite) via Drizzle. All timestamps are ISO-8601 UTC strings (`_at`), all actors are
operator email addresses from the Access identity (`_by`). Money is stored as integer
pence (`day_rate_pence`); fee bands are **never stored** — derived via
`shared/feeBands.ts` (FR-019).

## Entities

### talent

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | Internal key; never shown to operators |
| reference | text | UNIQUE, NOT NULL | `TAL-NNNN` (FR-002); immutable, never reused |
| name | text | NOT NULL, 1–200 chars | Required (FR-001) |
| headline | text | nullable, ≤ 200 chars | Professional headline |
| biography | text | nullable | Long-form; publication-gated (FR-010) |
| day_rate_pence | integer | nullable, ≥ 0 | Absent/0 displays "No day rate", blocks publication |
| location | text | nullable, ≤ 200 chars | Free text (e.g. "Manchester, UK") |
| email | text | nullable, valid email when present | Talent's own contact |
| phone | text | nullable, ≤ 50 chars | Stored as entered |
| status | text | NOT NULL, CHECK in fixed vocabulary | Default `available` (FR-005) |
| archived_at | text | nullable | Non-null ⇒ archived (FR-012) |
| version | integer | NOT NULL, default 1 | Optimistic lock (FR-016); +1 every write |
| created_at / created_by | text | NOT NULL | |
| updated_at / updated_by | text | NOT NULL | |

Indexes: `reference` (unique), `name` (collate nocase), `status`, `archived_at`,
`day_rate_pence`.

**Status vocabulary** (stored lowercase; rendered via shared enum → label/badge-tone
map): `available` · `on_hold` · `booked` · `confirmed` · `cancelled`. Any→any manual
transitions allowed (bookings module will constrain later). Restore-from-archive resets
status to `available` (spec US5).

### talent_photo

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | text | PK (nanoid) | Used in R2 key |
| talent_id | integer | FK → talent, NOT NULL | Cascade restrict |
| r2_key_original / r2_key_display | text | NOT NULL | Original + resized WebP rendition |
| content_type | text | NOT NULL | image/jpeg, image/png, image/webp only |
| is_primary | boolean | NOT NULL default false | Exactly one primary per talent when any exist (enforced in service layer) |
| sort_order | integer | NOT NULL default 0 | |
| created_at / created_by | text | NOT NULL | |

No photo ⇒ UI renders initials avatar (US1-S4). Upload limit 10 MB; failures leave prior
state untouched (edge case).

### topic

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | |
| name | text | UNIQUE COLLATE NOCASE, NOT NULL, 1–60 chars | Case-insensitive dedup (FR-018) |
| created_at / created_by | text | NOT NULL | |

**Merge semantics** (FR-018): merging topic B into A rewrites `talent_topic` rows
(B→A, ignoring duplicates), writes a `change_record` per affected talent, then deletes B —
all in one transaction. **Rename** updates `name` in place (uniqueness re-checked).

### talent_topic

| Column | Type | Constraints |
|---|---|---|
| talent_id | integer | FK → talent, NOT NULL |
| topic_id | integer | FK → topic, NOT NULL |
| PK | (talent_id, topic_id) | |

Every active talent has ≥ 1 row (FR-001; enforced on create/update in service layer).

### brand

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | |
| slug | text | UNIQUE, NOT NULL | e.g. `great-british-speakers` |
| name | text | NOT NULL | Display name |
| created_at | text | NOT NULL | |

Seeded with Great British Speakers. Adding a brand = one insert; no talent data changes
(FR-011).

### publication

Row exists ⇔ talent is published to that brand (FR-009).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| talent_id | integer | FK → talent | |
| brand_id | integer | FK → brand | |
| PK | (talent_id, brand_id) | |
| published_at / published_by | text | NOT NULL | Shown on profile (US4-S3) |

Insert is **gated**: requires non-null/positive `day_rate_pence`, non-empty `biography`,
≥ 1 photo, and `archived_at IS NULL` (FR-010, FR-012). Archiving deletes all publication
rows in the same transaction (with change records) — the auto-unpublish disclosure.

### change_record (append-only, FR-004)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PK autoincrement | |
| talent_id | integer | FK → talent, NOT NULL, indexed | |
| actor | text | NOT NULL | Operator email |
| action | text | NOT NULL | `created` · `field_changed` · `status_changed` · `published` · `unpublished` · `archived` · `restored` · `photo_added` · `photo_removed` · `topic_merged` |
| field | text | nullable | For `field_changed` |
| old_value / new_value | text | nullable | Stringified; day rates stored as pence strings |
| at | text | NOT NULL | |

No UPDATE/DELETE path exists in the API or service layer. Written in the same D1
transaction as the mutation it records.

### ref_counter

Single row: `next_number` integer, starting 1. Incremented transactionally on talent
creation (research R6). Formatting (`TAL-` + 4-digit zero-pad, widening past 9999) lives
only in `shared/reference.ts`.

## Relationships

```text
talent 1─* talent_photo
talent *─* topic          (via talent_topic, ≥1 per active talent)
talent *─* brand          (via publication = published state)
talent 1─* change_record  (append-only history)
```

## Validation rules (enforced via shared Zod schemas — FR-014/015)

- `name` required, trimmed, 1–200 chars.
- ≥ 1 topic on create and on every update of an active record.
- `email` RFC-shaped when present; `phone` free-form ≤ 50.
- `day_rate_pence` integer ≥ 0 or null; zero/null renders "No day rate" and blocks publish.
- `status` must be one of the five enum values — schema-level, no free text (FR-005).
- Publication preconditions (FR-010) return the missing-item list verbatim for the UI's
  factual messages ("Add a day rate before publishing").
- All user-facing formatting (GBP `£4,000`, dates `12 Aug 2026`, reference styling) via
  `shared/format.ts` only — no ad-hoc `toLocaleString` calls (FR-013).

## State transitions

```text
status:    available ⇄ on_hold ⇄ booked ⇄ confirmed ⇄ cancelled   (any→any, manual)
archive:   active ──archive──▶ archived ──restore──▶ active(status=available)
           archive ⇒ delete all publication rows (same transaction)
publish:   unpublished ──publish(brand, gates pass)──▶ published(brand)
           published(brand) ──unpublish(brand)──▶ unpublished
version:   every successful mutation ⇒ version += 1; stale version ⇒ 409, no write
```
