# Research: Talent Documents

Shaping decisions were confirmed with the owner (general locker; step + Documents section;
version history). This records the codebase-integration decisions.

## R1 — Separate R2 bucket vs reusing the photos bucket

- **Decision**: A new R2 bucket `gbt-documents` (binding `DOCUMENTS`), separate from `gbt-photos`.
- **Rationale**: Photos are on a path (`/api/photos/:id`) that the future public site engine
  (ADR 0004) will likely expose publicly. Documents must never be public. Keeping documents in
  their own bucket, served only by a strictly authenticated endpoint, removes any risk of a
  future public photo path ever reaching a document. Clean lifecycle/erasure boundary too.
- **Alternatives considered**: Reuse `gbt-photos` with a `docs/` prefix — rejected; couples a
  sensitive store to a soon-to-be-public one. Recorded as ADR 0006.

## R2 — Store-then-record ordering (no orphans, FR-012)

- **Decision**: On upload, write the R2 object first, then insert the D1 rows; if the D1 write
  fails, best-effort delete the just-written object. On delete, remove D1 rows first, then delete
  the R2 objects (a leftover object without a row is invisible and harmless; a row without an
  object is not — so records never outlive their files on the read path). Downloads tolerate a
  missing object with a factual 404 rather than a crash (as photos do).
- **Rationale**: D1 has no cross-service transaction with R2; ordering + compensating delete is
  the pragmatic guarantee. Mirrors the spec 008 photo approach.
- **Alternatives considered**: Two-phase/pending state — over-engineered for this scale.

## R3 — Version model (two tables)

- **Decision**: `talent_document` (the logical document) + `talent_document_version` (each
  uploaded file). Current version = highest `version_no` for the document. New upload to an
  existing document adds a version row; a fresh document creates the parent + version 1.
- **Rationale**: Honest representation of "a document with a history of versions"; keeps the list
  simple (one row per logical doc, join to its current version) while retaining full history.
- **Alternatives considered**: Single flat table with a group key + is_current flag — workable
  but muddier integrity (two rows could both be current); two-table is clearer.

## R4 — Authenticated download

- **Decision**: `GET /api/talent/:reference/documents/:versionId/file` streams the R2 object with
  `Content-Disposition: attachment; filename="…"` and the stored content type. It sits under
  `/api/*`, so the identity + registry gate already apply (FR-009). No public/presigned URL.
- **Rationale**: Same authenticated-serve model as photos, but documents get their own endpoint
  so they are never reachable through the photo path.
- **Alternatives considered**: R2 presigned URLs — rejected; they create a bearer link that
  escapes the registry gate.

## R5 — Allowed types & size

- **Decision**: Allow `application/pdf`, Word (`.doc`/`.docx`), plain text, and image types
  (`image/jpeg`, `image/png`); max 25 MB per file (matches the import ceiling). Validate by MIME
  type and reject otherwise with a factual message; store nothing on rejection (FR-008).
- **Rationale**: Covers agreements, scans and letters without opening the door to executables.
  25 MB is already an established limit in the product (roster import).
- **Alternatives considered**: Unrestricted types — rejected (malware/abuse surface).

## R6 — Publish-safe boundary & change records

- **Decision**: Document data is served only from the documents endpoints; it is absent from
  `serializeTalent` and any public shape (guard test, FR-010/SC-005). Change-record actions:
  `document_uploaded`, `document_version_added`, `document_deleted`, with `field` = document title
  or step label, flowing into History/dashboard/statistics (FR-011) exactly like other actions.
- **Rationale**: Consistent with the spec 010 boundary and the spec 004/005/006 attribution
  fabric; no new plumbing.

## R7 — Access control granularity

- **Decision**: No new permission; any registered operator may upload/list/download/delete,
  attributed (as notes/onboarding attestation). Owner auto-holds everything regardless.
- **Rationale**: Document handling is core bookings-team work; a permission area is unwarranted
  scope now and can be added later without rework if restriction is wanted.
