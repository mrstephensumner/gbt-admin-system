# Data Model: Talent Availability

## States (shared/availability.ts — fixed vocabulary)

| key        | label     | tone (BadgeTone) | colour |
|------------|-----------|------------------|--------|
| available  | Available | success          | green  |
| pencilled  | Pencilled | warning          | yellow |
| confirmed  | Confirmed | info             | blue   |
| blocked    | Blocked   | danger           | red    |

- **Cell precedence** (multiple entries on a day): `confirmed > blocked > pencilled > available`.
- **Working week options**: `mon_fri` (Mon–Fri, default), `mon_sat` (Mon–Sat), `all` (every day).
- Helper `buildMonthGrid(year, month)` → Monday-first weeks of date cells (pure, unit-tested).
- Helper `entryCoversDate(entry, isoDate)` and `cellState(entriesForDay)` (precedence).

## New table: `talent_availability`

| column      | type              | notes                                             |
|-------------|-------------------|---------------------------------------------------|
| id          | integer PK        |                                                   |
| talent_id   | integer NOT NULL  | FK → talent(id)                                   |
| state       | text NOT NULL     | available \| pencilled \| confirmed \| blocked    |
| title       | text NOT NULL     | e.g. "Barclays Events", "Annual leave"            |
| detail      | text NULL         | e.g. "Keynote" / "Workshop (pencilled)"           |
| location    | text NULL         | e.g. "London"                                     |
| start_date  | text NOT NULL     | `YYYY-MM-DD`                                       |
| end_date    | text NOT NULL     | `YYYY-MM-DD`, ≥ start_date                         |
| created_by  | text NOT NULL     | operator                                          |
| created_at  | text NOT NULL     | ISO timestamp                                     |
| updated_by  | text NOT NULL     | operator (last change)                            |
| updated_at  | text NOT NULL     | ISO timestamp                                     |

Index on `talent_id`; index on `(talent_id, start_date, end_date)` for the month overlap query.

## New column on `talent`

| column        | type       | notes                                   |
|---------------|------------|-----------------------------------------|
| working_week  | text NULL  | `mon_fri` \| `mon_sat` \| `all`; app default `mon_fri` |

Additive `ADD COLUMN` (no CHECK → no table rebuild).

## Month query

Entries overlapping the visible month: `WHERE talent_id = ? AND start_date <= :monthEnd AND
end_date >= :monthStart` (dates as `YYYY-MM-DD`).

## Read shape

`GET …/availability?month=YYYY-MM` →
`{ entries: [{ id, state, title, detail, location, start_date, end_date, updated_by, updated_at }],
   working_week }`. The client builds the grid and the "This month" list from `entries`.

## Migration `0010_availability.sql`

`CREATE TABLE talent_availability …` + indexes + `ALTER TABLE talent ADD COLUMN working_week text`.
Additive; existing speakers have no entries and a null working week (treated as `mon_fri`).

## Publish-safe exclusion

No `talent_availability` data and no `working_week` appear in `serializeTalent` or any public shape
(guard test).
