# Quickstart & Validation: Admin Roles & Operator Management

Contracts: [contracts/api.md](contracts/api.md) · Data: [data-model.md](data-model.md).
Prerequisites as spec 001 (repo, Node 22+, branch `002-admin-roles`).

## Setup

```bash
cd app
npm install
npx wrangler d1 migrations apply gbt_admin --local   # applies 0001_operators
npm run seed:dev
npm run dev                                          # http://localhost:8787
```

Local identity is header-driven (`Cf-Access-Authenticated-User-Email`), which makes
role testing easy: browser extensions or curl can impersonate any email locally.
`OWNER_EMAIL` for local dev is set in `.dev.vars`.

## Automated validation

```bash
npm run typecheck && npm run lint
npm run test:unit               # + permissions module
npm run test:integration       # + authorization matrix, team CRUD, owner invariants
npm run test:e2e               # + owner/limited-operator journeys
```

## Manual journey validation (maps to spec user stories)

1. **US1 — registry gate**: With the dev owner identity, everything works and Team shows
   you as Owner. Then `curl -H "Cf-Access-Authenticated-User-Email: stranger@example.com"
   localhost:8787/api/talent` → `403 not_registered`; the UI for that identity shows the
   "ask the owner" screen and no data.
2. **US2 — team management**: As owner, add `colleague@example.com` on the Team screen →
   they appear with no grants; curl as them: directory works, publish fails. Remove them
   → next request `403`; their earlier changes still show their email; audit trail lists
   add + remove with you as actor.
3. **US3 — permission limits**: Grant the colleague only `publish`. As them: publish a
   complete record ✓; archive → 403 with "ask the owner" message; day-rate PATCH → 403,
   record unchanged; the UI shows day rate read-only and no archive button. Revoke
   `publish` → their immediate next publish attempt fails (no re-login).
4. **Owner invariants**: attempt to remove or restrict the owner via UI and direct
   request → refused (`owner_invariant`); confirm exactly one owner in the Team list.

## Production rollout note

Set `OWNER_EMAIL` in `wrangler.jsonc` to the address Stephen signs in with via Access
**before** deploying (check it at `/api/me` on production today). After deploy, the
first authenticated request bootstraps the owner (audited); then register the rest of
the team from the Team screen.
