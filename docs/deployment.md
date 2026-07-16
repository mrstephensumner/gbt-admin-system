# Deployment

Target: **greatbritishtalent.online** (Cloudflare — see ADR
[0002](decisions/0002-tech-stack.md)). One Worker serves the SPA and the API.

> **Status: LIVE as of 16 Jul 2026.** greatbritishtalent.online serves the admin behind
> Cloudflare Access (Bookings Team allow-list; one-time PIN and Cloudflare login methods).
> D1 `gbt_admin` (003ddb66…) and R2 `gbt-photos` are in production. The steps below are
> kept for rebuilding the environment from scratch.

## One-time setup (completed 16 Jul 2026)

```bash
cd app
npx wrangler login                     # interactive browser auth
npx wrangler d1 create gbt_admin       # copy database_id into wrangler.jsonc
npx wrangler r2 bucket create gbt-photos
npx wrangler d1 migrations apply gbt_admin --remote
npm run deploy                         # builds + wrangler deploy → workers.dev preview URL
```

Then bind the custom domain: Cloudflare dashboard → Workers & Pages → gbt-admin →
Settings → Domains & Routes → add `greatbritishtalent.online`.

## Cloudflare Access (interim authentication — research R5, FR-017)

Before the domain goes live, protect it with Access:

1. Zero Trust dashboard → Access → Applications → Add self-hosted application for
   `greatbritishtalent.online`.
2. Policy: allow the bookings team's email addresses (or the company email domain).
3. Copy the application's **AUD tag** and the team domain (e.g.
   `yourteam.cloudflareaccess.com`) into `wrangler.jsonc` vars `ACCESS_AUD` and
   `ACCESS_TEAM_DOMAIN`, then redeploy.

With those vars set, the Worker verifies the Access JWT on every API request and uses the
authenticated email as the operator identity in change history. With them empty (local
dev), a dev identity header is accepted instead. Setting only one of the two vars is
rejected as a config error (`access_misconfigured`, HTTP 500) rather than silently
locking everyone out.

**First-deploy smoke check (FR-017 happy path)**: after enabling Access, sign in on
`greatbritishtalent.online`, open the browser console, and confirm `fetch('/api/me')`
returns your own email — that proves JWT verification and identity extraction work
end-to-end (the rejection paths are covered by `tests/integration/auth.test.ts`).

## CI/CD

The GitHub Actions workflow currently lives at `docs/ci/github-workflow-ci.yml` — the git
credential lacks the `workflow` scope, so it cannot be pushed into `.github/workflows/`
yet (see `docs/ci/README.md`). Once activated, it runs typecheck/lint/unit/integration on
every PR, Playwright e2e on PRs to main, and `wrangler deploy` on merge to main using the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## Local development

See `specs/001-talent-management/quickstart.md` — `npm run dev` in `app/` serves the built
SPA + API on http://localhost:8787 with a local D1 and dev identity.
