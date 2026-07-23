# API Contracts: Talent Documents

All under the Access-gated admin API (`/api/*`), registered operators only. Error envelope:
`{ error: { code, message } }`. Reference is the `TAL-` reference.

## GET `/api/talent/:reference/documents`

List a speaker's documents (current version of each).

**200**:
```json
{
  "documents": [
    { "id": 12, "step_key": "rep_agreement", "step_label": "Representation agreement",
      "title": "Representation agreement", "versionCount": 2,
      "current": { "versionId": 34, "version_no": 2, "filename": "agreement-v2.pdf",
        "content_type": "application/pdf", "size_bytes": 184320,
        "uploaded_by": "jo@…", "uploaded_at": "2026-07-23T10:00:00Z" } },
    { "id": 13, "step_key": null, "title": "Speaker rider", "versionCount": 1, "current": { … } }
  ]
}
```

## POST `/api/talent/:reference/documents`

Upload a **new** document (multipart form). Creates the document + version 1.

- Form fields: `file` (required), `title` (optional — defaults to the file name),
  `step_key` (optional — an attestation step key; omit/empty for the general locker).
- **201**: the created document (as a list entry).
- Errors: `400 missing_file`; `400 unsupported_type` (not an allowed MIME);
  `400 too_large` (> 25 MB); `400 bad_step` (`step_key` is not an attestation step);
  `404 not_found` (no such speaker).
- On success writes a `document_uploaded` change record (`field` = title or step label).

## POST `/api/talent/:reference/documents/:documentId/versions`

Upload a **new version** of an existing document (multipart, `file` required).

- **201**: the document with the new current version.
- Errors: as upload, plus `404 not_found` (no such document).
- Writes a `document_version_added` change record.

## GET `/api/talent/:reference/documents/:versionId/file`

Download a specific version's file.

- **200**: the file bytes, `Content-Type` = stored type,
  `Content-Disposition: attachment; filename="<original name>"`.
- `404 not_found` if the version or its stored object is missing.
- Authenticated (under `/api/*`); no public/presigned URL exists.

## GET `/api/talent/:reference/documents/:documentId/versions`

Version history for a document (newest first): `versions[]` with `versionId`, `version_no`,
`filename`, `size_bytes`, `uploaded_by`, `uploaded_at`.

## DELETE `/api/talent/:reference/documents/:documentId`

Delete the whole document — all versions and all stored files (erasure).

- **200**: `{ ok: true }` and the document no longer appears in any list.
- Removes D1 rows first, then the R2 objects. Writes a `document_deleted` change record
  (the file contents are not retained).
- `404 not_found` if no such document.

## Publish-safe exclusion (FR-010 / SC-005)

No document data — files, titles, filenames, existence, uploaders — appears in any publish-safe
or public serialization of a speaker. Enforced by an integration guard test over the publish-safe
shape.
