# Quickstart & Validation: Roster Import from File

Contracts: [contracts/api.md](contracts/api.md) · Data: [data-model.md](data-model.md).
Prerequisites as before (branch `003-roster-import`).

## Setup

```bash
cd app
npm install
npx wrangler d1 migrations apply gbt_admin --local   # applies 0002_import
npm run seed:brand
npm run dev
```

The dev identity is the owner (holds `import_roster` automatically). A fixture export
lives at `tests/fixtures/roster-sample.csv` (synthetic, matches the mockup's field
groups incl. awkward rows: missing ids, "POA" fees, accents, duplicate ids).

## Automated validation

```bash
npm run typecheck && npm run lint
npm run test:unit          # + column mapping, money parser, row schema
npm run test:integration   # + import API: dry-run, staging idempotence, approval, permissions
npm run test:e2e           # + upload fixture → review → bulk approve journey
```

## Manual journey validation (maps to spec user stories)

1. **US1 — upload & validate**: Import screen (new nav item) → drop
   `tests/fixtures/roster-sample.csv` → validation report reconciles (found = clean +
   problems, reasons listed, mapping shown) → Confirm → candidates staged; roster
   unchanged; run listed under Recent transfers.
2. **US2 — review & approve**: open a candidate, fix a field, approve → record exists
   with fresh `TAL-` ref, day rate carried over, unpublished, import-attributed history.
   Select several → bulk approve → progress reported, failures (the topic-less row)
   listed without blocking. Skip a junk row → gone from the queue.
3. **US3 — idempotence**: drop the same file again → validation shows untouched
   imported/skipped, refreshed news; zero duplicates in staging or roster. Edit an
   imported record's headline in the admin, re-upload → edit survives.
4. **Permissions**: as a non-granted operator (curl with a colleague identity header):
   every /api/import/* call → 403 with the factual refusal; grant `import_roster` on the
   Team screen → allowed; Import nav item appears/disappears accordingly.

## The real file

When the actual back-office export arrives: drop it on Validate first. The report shows
the column mapping used and any unmapped headers — if the real headings differ from the
synonym table (`app/shared/importing.ts`), extending the synonyms is a one-line change
per column. Nothing needs re-architecting.
