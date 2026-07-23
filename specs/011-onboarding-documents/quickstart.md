# Quickstart & Validation: Talent Documents

## Prerequisites

```bash
cd app
pkill -9 -f wrangler; pkill -9 -f workerd
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local        # applies 0009_documents.sql
npm run seed:brand
# The local gbt-documents R2 bucket is auto-created by miniflare from the binding.
npm run dev                     # http://localhost:8787 (dev identity = owner)
```

Remote only (once): `npx wrangler r2 bucket create gbt-documents` before the first deploy.

## Validation scenarios

1. **File round-trip (US1, SC-001)** — On a speaker's **Documents** tab, upload a PDF with a
   title; it appears with name/size/uploader/date; download it and confirm identical bytes.
2. **Step attachment (US2)** — On the Representation agreement onboarding step, upload a file;
   it shows on the step and also in the Documents tab, labelled with that step. Derived steps
   (headshots/biography/fee) show no upload control.
3. **Version history (US3, SC-003)** — Upload a new version to an existing document; the newest
   is current, the previous version is still downloadable, each shows its own uploader/date.
4. **Delete / erasure (US4, SC-004)** — Delete a document; it and all versions disappear, the
   stored files are gone (download returns 404), and the deletion is recorded in History.
5. **Auth gate (US5, SC-006)** — A document file request without a registered-operator identity
   is refused.
6. **Publish-safe (US5, SC-005)** — The publish-safe shape of the speaker contains no document
   data (integration guard test).
7. **Validation (edge)** — An unsupported type or an oversized file is refused with a factual
   message and nothing is stored.

## Automated verification

```bash
npm run test:unit          # allowed types/size, current-version selection
npm run test:integration   # upload/list/download/version/delete, auth, publish-safe, change records
npx playwright test tests/e2e/us-documents.spec.ts
npm run lint && npm run typecheck
```

**Definition of done**: all three tiers green, lint + typecheck clean, publish-safe + auth-gate
tests present and passing, Documents tab + step control match the design system.
