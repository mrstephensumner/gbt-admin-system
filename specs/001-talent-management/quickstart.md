# Quickstart & Validation: Talent Management Module

How to run the module locally and prove, end-to-end, that the spec's five user stories
work. Contracts: [contracts/api.md](contracts/api.md) · Data: [data-model.md](data-model.md).

## Prerequisites

- Node 22+, npm
- Wrangler CLI (`npm i -g wrangler`) logged into the Cloudflare account holding
  `greatbritishtalent.online`
- Repo cloned, branch `001-talent-management`

## Setup

```bash
cd app
npm install
npx drizzle-kit generate        # ensure migrations are current with schema
npx wrangler d1 migrations apply gbt_admin --local
npm run seed:dev                # 1 brand, ~20 talent, topics; use seed:perf for 5,000
npm run dev                     # wrangler dev: SPA + API on http://localhost:8787
```

Local dev injects `Cf-Access-Authenticated-User-Email: dev@greatbritishtalent.online`
(see `worker/middleware/`), standing in for Cloudflare Access.

## Automated validation

```bash
npm run typecheck && npm run lint
npm run test:unit               # shared domain: enums, TAL- refs, formatters, fee bands
npm run test:integration        # every API endpoint incl. 409 / 422-gating / archive
npm run test:e2e                # Playwright: the five journeys below
npm run test:e2e:perf           # SC-003 timing against the 5,000-record seed
```

All suites green = constitution Principle VI satisfied for merge.

## Manual journey validation (maps 1:1 to spec user stories)

1. **US1 — Add & maintain**: Add speaker → save with name + one topic → profile shows
   `TAL-0001`-style reference and initials avatar → edit day rate → history shows the
   change with your identity. Omit name → factual sentence-case error, no save.
2. **US2 — Find fast**: With `seed:perf` loaded, search a name fragment → count updates
   ("Showing X of 5,000 speakers") in under 2 s; combine topic + status filters; page
   forward and confirm filters persist; nonsense query → empty state with "Clear filters".
3. **US3 — Status**: Set a record to On hold → amber badge in profile header and
   directory row; only the five vocabulary options are offered; history records the
   change.
4. **US4 — Publication**: New record → publish blocked with "Add a day rate before
   publishing" (and each other missing item); complete the record → publish to Great
   British Speakers → published for that brand only, with who/when; unpublish reverts.
5. **US5 — Archive**: Archive a published record → confirmation names the talent and
   discloses auto-unpublish → record leaves default directory, reachable via archived
   filter, publish actions gone → restore → back in directory, status Available, history
   intact.

Cross-cutting checks while in there: money renders `£4,000` style, dates `12 Aug 2026`,
references mono/uppercase, sentence-case UI, no emoji — and screens match
`design-system/ui_kits/admin/` (constitution Principle III acceptance bar).

## Concurrency check (FR-016)

Open the same profile in two tabs; save an edit in tab 1, then attempt a save in tab 2 →
tab 2 gets "This record changed while you were editing" (409 path), no silent overwrite.

## Deploy (when ready)

```bash
npx wrangler d1 migrations apply gbt_admin --remote
npx wrangler deploy             # workers.dev preview until the domain is attached
# then bind greatbritishtalent.online (Worker custom domain) + enable Cloudflare Access
```

Expected outcome: the same journeys pass on the deployed URL behind Access, with real
operator emails appearing in change history.
