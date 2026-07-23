# Data Model: Profile Enrichment

## shared/enrichment.ts (fixed vocabulary + pure helpers)

- **States**: `draft | admin_approved | talent_approved | published`.
- `wordCount(text)`, `trigramSimilarity(a, b)` → 0–1 (word-trigram Jaccard), `scanBanned(text,
  list)` → matched terms, `buildPrompt({talent facts, brief, bannedList, houseStyle})` →
  `{ system, user }` (British English, grounding, word-count band).
- Model options list (current Anthropic models), default model id.

## New table: `enrichment_settings` (single row, id = 1)

| column          | type       | notes                                                    |
|-----------------|------------|----------------------------------------------------------|
| id              | integer PK | always 1                                                 |
| key_ciphertext  | text NULL  | AES-GCM ciphertext (base64) of the Anthropic key          |
| key_iv          | text NULL  | base64 IV                                                 |
| key_hint        | text NULL  | last 4 chars, for display only                            |
| model           | text NOT NULL | default current model id                              |
| banned_words    | text NOT NULL default '[]' | JSON array of banned words/phrases     |
| house_style     | text NULL  | optional extra style guidance                             |
| updated_by      | text NOT NULL                                                         |
| updated_at      | text NOT NULL                                                         |

The raw key is NEVER stored or returned in plaintext; reads expose `{ configured: bool, key_hint,
model, banned_words, house_style }` only.

## New columns on `brand` (editorial brief)

| column           | type       | notes                                    |
|------------------|------------|------------------------------------------|
| brief_audience   | text NULL  | who the site serves / positioning        |
| brief_tone       | text NULL  | tone/voice                               |
| brief_wordmin    | integer NULL | ideal word-count floor                  |
| brief_wordmax    | integer NULL | ideal word-count ceiling                |
| brief_include    | text NULL  | things to emphasise                      |
| brief_exclude    | text NULL  | things to avoid (per-site)               |

## New column on `talent`

| column          | type      | notes                                                   |
|-----------------|-----------|---------------------------------------------------------|
| source_material | text NULL | optional extra facts (achievements, testimonials) to ground from |

## New table: `talent_site_bio` (per talent × site)

| column              | type              | notes                                          |
|---------------------|-------------------|------------------------------------------------|
| id                  | integer PK        |                                                |
| talent_id           | integer NOT NULL  | FK → talent(id)                                |
| brand_id            | integer NOT NULL  | FK → brand(id)                                 |
| body                | text NOT NULL     | the bio text                                   |
| state               | text NOT NULL     | draft \| admin_approved \| talent_approved \| published |
| word_count          | integer NOT NULL  |                                                |
| similarity          | integer NOT NULL  | 0–100 (trigram Jaccard × 100, vs master)       |
| model               | text NULL         | model used to generate                         |
| generated_by        | text NULL         | operator who generated                         |
| generated_at        | text NULL         |                                                |
| admin_approved_by   | text NULL         |                                                |
| admin_approved_at   | text NULL         |                                                |
| talent_approved_by  | text NULL         | talent name/identifier (attestation, v1)       |
| talent_approved_at  | text NULL         |                                                |
| published_at        | text NULL         |                                                |
| updated_by          | text NOT NULL     |                                                |
| updated_at          | text NOT NULL     |                                                |

Unique `(talent_id, brand_id)` — one working bio per talent×site (regeneration replaces the draft;
publishing freezes `body` as the live version until re-approved). Index on `talent_id`.

## State machine (FR-008/011)

`draft` → (admin approves) `admin_approved` → (talent approval recorded) `talent_approved` →
(publish) `published`. Editing the body from any approved state drops it back to `draft` (both
approvals cleared — re-approval required). Regenerate replaces the body and resets to `draft`.
Publish is refused unless the current state is `talent_approved`.

## Publish-safe read (FR-010)

`publishSafeBios(talentId)` → `[{ brand_slug, body }]` for rows with `state = 'published'` ONLY.
Nothing else (drafts, briefs, settings, key, similarity internals) is publish-safe. `serializeTalent`
is unchanged and continues to exclude all enrichment data.

## Migration `0011_enrichment.sql`

Create `enrichment_settings` (+ seed row id=1 with default model, `banned_words='[]'`), create
`talent_site_bio` (+ unique + index), ALTER `brand` add the six brief columns, ALTER `talent` add
`source_material`. Additive (no CHECK on new columns → no talent-table rebuild).
