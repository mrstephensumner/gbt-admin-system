# Data Model: Talent Documents

## New table: `talent_document` (the logical document)

| column      | type              | notes                                                   |
|-------------|-------------------|---------------------------------------------------------|
| id          | integer PK        |                                                         |
| talent_id   | integer NOT NULL  | FK → talent(id)                                         |
| step_key    | text NULL         | onboarding attestation step key, or NULL = general locker |
| title       | text NOT NULL     | human label (e.g. "Representation agreement")           |
| created_by  | text NOT NULL     | operator who first filed it                             |
| created_at  | text NOT NULL     | ISO timestamp                                           |

Index on `talent_id`. `step_key`, when set, is one of the attestation step keys
(`rep_agreement`, `identity`, `bank_details`, `safeguarding`) — never a derived step.

## New table: `talent_document_version` (each uploaded file)

| column        | type              | notes                                             |
|---------------|-------------------|---------------------------------------------------|
| id            | integer PK        |                                                   |
| document_id   | integer NOT NULL  | FK → talent_document(id)                           |
| version_no    | integer NOT NULL  | 1-based; current = max for the document           |
| r2_key        | text NOT NULL     | object key in the `gbt-documents` bucket          |
| filename      | text NOT NULL     | original file name                                |
| content_type  | text NOT NULL     | stored MIME type                                  |
| size_bytes    | integer NOT NULL  | file size                                         |
| uploaded_by   | text NOT NULL     | operator                                          |
| uploaded_at   | text NOT NULL     | ISO timestamp                                     |

Index on `document_id`. Current version = `MAX(version_no)` per `document_id`.

## R2 key scheme (bucket `gbt-documents`)

`talent/<reference>/<documentId>/<versionNo>-<nanoid>` — namespaced per speaker and document so
listing/erasure is straightforward and keys never collide.

## Allowed types & size (shared/documents.ts)

- Allowed MIME: `application/pdf`, `application/msword`,
  `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`,
  `image/jpeg`, `image/png`.
- Max size: 25 MB.
- `currentVersion(versions)` helper returns the highest `version_no`.

## Read shapes

- **List** (per speaker): `documents[]` = `{ id, step_key, step_label?, title, current: { versionId,
  filename, content_type, size_bytes, uploaded_by, uploaded_at, version_no }, versionCount }`,
  grouped in the UI by step vs general.
- **Version history** (per document): `versions[]` newest-first with uploader + date.
- Downloads reference a `versionId`.

## Publish-safe exclusion

No `talent_document` / `talent_document_version` data appears in `serializeTalent` or any public
shape (guard test, SC-005). Documents are served only by the documents endpoints.

## Migration `0009_documents.sql`

`CREATE TABLE talent_document …` + `CREATE TABLE talent_document_version …` + the two indexes.
Additive only; existing speakers simply have no document rows.
