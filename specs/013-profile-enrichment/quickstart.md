# Quickstart & Validation: Profile Enrichment

## Prerequisites

```bash
cd app
pkill -9 -f wrangler; pkill -9 -f workerd
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local        # applies 0011_enrichment.sql (seeds settings row)
npm run seed:brand
# Local dev needs the key-encryption key. Add to .dev.vars (NOT committed):
echo 'ENRICHMENT_KEK="<32-byte-base64>"' >> .dev.vars
npm run dev
```

Remote (once): `npx wrangler secret put ENRICHMENT_KEK` before the first deploy.

## Validation scenarios

1. **Settings & key secrecy (US1, SC-001)** — As owner, open AI enrichment settings, save an
   Anthropic key + banned words. Re-open: the key shows only a masked hint (last 4), never in full.
   `GET /api/enrichment/settings` returns `configured:true` + hint, never the raw key.
2. **Site brief (US2)** — In the Network screen, set Great Business Speakers' brief (audience, tone,
   120–180 words). It persists.
3. **Generate (US3)** — On a speaker with a master bio, open **Profile Enrichment**, generate for
   Great Business Speakers. A British-English draft appears with word count, a similarity-to-master
   score, and any banned-word hits flagged. (In automated tests the Anthropic call is stubbed.)
4. **No key / no bio (edge)** — With no key configured, generate is refused with a factual message;
   likewise with no master bio.
5. **Dual approval + publish (US4, SC-003)** — Edit the draft; admin-approve; record talent approval;
   publish. Publishing before both approvals is refused, naming the missing one. After publish, the
   bio is the site's live biography.
6. **Publish-safe (SC-004)** — `publishSafeBios` returns only the published bio for its site; the
   talent record shape and any public shape contain no key/drafts/settings.
7. **Coverage (US5)** — A talent on three sites with one published shows one published and two
   incomplete.
8. **Immutability (FR-011)** — Editing after publish drops the bio back to draft (re-approval
   required); the previously-published body does not silently change.

## Automated verification

```bash
npm run test:unit          # similarity, banned scan, word count, prompt builder, state machine, crypto round-trip
npm run test:integration   # settings key-never-leaks, generation (fetchMock stub), approval gate, publish-safe guard, change records
npx playwright test tests/e2e/us-enrichment.spec.ts
npm run lint && npm run typecheck
```

**Definition of done**: all three tiers green, lint + typecheck clean; key-secrecy, approval-gate
and publish-safe guard tests present and passing; settings screen, brief section and enrichment tab
match the design system.
