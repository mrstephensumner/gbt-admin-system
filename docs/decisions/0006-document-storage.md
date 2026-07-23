# 0006 — Talent document storage: a separate, never-public bucket

- **Date:** 23 Jul 2026
- **Status:** Accepted (enacted by spec 011)
- **Context:** Spec 011 adds a per-speaker document store (representation agreements and other
  files, filed generally or against an onboarding step). Files must be held in object storage.
  The system already has an R2 bucket, `gbt-photos`, served through `/api/photos/:id`. Photos are
  on a path the future multi-tenant site engine ([ADR 0004](0004-multi-tenant-site-engine.md))
  is expected to expose **publicly**. Documents — which may include confidential contracts and
  special-category personal data (passports, DBS certificates) — must **never** be public.

## Decision

1. **Documents live in their own R2 bucket, `gbt-documents`** (Worker binding `DOCUMENTS`),
   separate from `gbt-photos`.
2. **Files are served only through an authenticated Worker endpoint**
   (`GET /api/talent/:reference/documents/:versionId/file`), under the `/api/*` identity +
   registry gate. No public bucket, no presigned/bearer URLs.
3. **No document data enters any publish-safe / public serialization** of a speaker
   (extends the spec 010 / ADR 0003 boundary to documents).
4. **Store-then-record ordering** guarantees no orphans: on upload, write the object then the D1
   rows (compensating-delete the object if the row write fails); on delete, remove D1 rows then
   the objects. Downloads tolerate a missing object with a factual 404.

## Consequences

- The remote `gbt-documents` bucket must be created once (`wrangler r2 bucket create
  gbt-documents`) before the first deploy of spec 011; the local bucket is auto-created by
  miniflare from the binding.
- Keeping documents off the photo bucket means that when the public site engine later exposes
  photos, there is no path by which a document could ever be reached — the separation is
  structural, not just a rule.
- Erasure is clean: deleting a document removes its D1 rows and every object under its key
  prefix in the documents bucket.
- If document access ever needs to be restricted below "any registered operator", a dedicated
  permission can be added without changing this storage decision.
