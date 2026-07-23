# Data Model: Talent Onboarding System

## Fixed step definitions (code, not data)

Defined in `shared/onboarding.ts` as an ordered constant. Not a table (Constitution V — fixed
vocabulary). `step_key` values are stable identifiers used as the `talent_onboarding_step` key
and in change records.

| order | step_key           | title                    | descriptor                | required_to_publish | completion   |
|-------|--------------------|--------------------------|---------------------------|---------------------|--------------|
| 1     | `rep_agreement`    | Representation agreement | Signed & countersigned    | no                  | attestation  |
| 2     | `identity`         | Identity & right to work | Passport verified         | no                  | attestation  |
| 3     | `bank_details`     | Bank & payment details   | For fee remittance        | no                  | attestation  |
| 4     | `headshots`        | Headshots & showreel     | Min. 3 hi-res images      | **yes**             | derived      |
| 5     | `biography`        | Biography & topics       | Long + short bio          | **yes**             | derived      |
| 6     | `fee_schedule`     | Fee schedule             | Day rate & travel terms   | **yes**             | derived-data |
| 7     | `safeguarding`     | Safeguarding & compliance| DBS where required        | no                  | attestation  |

**Status enum** (`shared/onboarding.ts`): `not_started` | `in_progress` | `complete` |
`not_applicable`. `not_applicable` is only valid for attestation steps.

**Completion derivation**:
- `headshots` → `talent_photo` count ≥ 1.
- `biography` → `talent.biography` non-empty.
- `fee_schedule` → `talent.day_rate_pence` is set (incl. explicit POA sentinel).
- attestation steps → stored `status` in `talent_onboarding_step`.

**`publishBlockers(talent, photoCount)`** (pure, shared): returns a subset of
`['day_rate','biography','photo']` — the unmet publish-required checks. Identical logic to the
current `publication.ts` `missing` array; used by both the publish action and the checklist.

## New table: `talent_onboarding_step`

Sparse — one row only when an attestation step has been acted on, or a step is set N/A.

| column      | type                    | notes                                                        |
|-------------|-------------------------|--------------------------------------------------------------|
| id          | integer PK              |                                                              |
| talent_id   | integer NOT NULL        | FK → talent(id)                                              |
| step_key    | text NOT NULL           | one of the attestation step keys                             |
| status      | text NOT NULL           | `in_progress` \| `complete` \| `not_applicable`              |
| note        | text NULL               | optional short internal note (attestation only)              |
| actor       | text NOT NULL           | operator who last set the status (attribution)               |
| at          | text NOT NULL           | ISO timestamp of last change                                 |

- **Unique** `(talent_id, step_key)` — upsert on update.
- Index on `talent_id`.
- **No** column for raw passport / bank / DBS numbers (FR-013, SC-004) — deliberately absent.

## New columns on `talent`

| column                    | type            | notes                                             |
|---------------------------|-----------------|---------------------------------------------------|
| half_day_rate_pence       | integer NULL    | ≥ 0 check                                          |
| after_dinner_rate_pence   | integer NULL    | ≥ 0 check                                          |
| travel_terms              | text NULL       | free text (owner decision); internal-only         |
| fees_vary_by_site         | integer NOT NULL default 0 | boolean; forward flag, override mechanism deferred |

`day_rate_pence` (existing) is the **standard day rate** — reused, not duplicated.

## Migration `0008_onboarding.sql`

1. `CREATE TABLE talent_onboarding_step (...)` + unique index + `talent_id` index.
2. `ALTER TABLE talent ADD COLUMN half_day_rate_pence INTEGER;`
3. `ALTER TABLE talent ADD COLUMN after_dinner_rate_pence INTEGER;`
4. `ALTER TABLE talent ADD COLUMN travel_terms TEXT;`
5. `ALTER TABLE talent ADD COLUMN fees_vary_by_site INTEGER NOT NULL DEFAULT 0;`

Additive only — safe on the 2,244-record production table; existing speakers start with no
onboarding rows (attestation steps `not_started`, derived steps reflect their real data).

## Derived read shape (per speaker)

`getOnboarding(talentId)` returns:
- `steps[]`: `{ key, title, descriptor, order, requiredToPublish, status, blocksPublish, note?,
  actor?, at? }` — status computed (derived) or read (attestation); `blocksPublish` true when
  `requiredToPublish && status !== 'complete'`.
- `progress`: `{ complete, applicable, percent }` — `applicable` excludes `not_applicable` steps.
- `fee`: `{ day_rate_pence, half_day_rate_pence, after_dinner_rate_pence, travel_terms,
  fees_vary_by_site }` — admin-only; never publish-safe.

## Publish-safe exclusion

`serializeTalent` publish-safe fields MUST NOT include: any `talent_onboarding_step` data,
`half_day_rate_pence`, `after_dinner_rate_pence`, `travel_terms`, `fees_vary_by_site`, or the
onboarding read shape. Asserted by an integration guard test (SC-005).
