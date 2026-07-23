# Tasks: Social & News visibility (spec 014)

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md). Tests included (Constitution VI). Paths under `app/`.

## Phase 1 — Data & shared
- [x] T001 Schema: `talent_notable_post` table + `public` column on `talent_social_link` and
  `talent_press_mention` in `worker/db/schema.ts`; `db:generate` → rename `0012_social_visibility.sql`
  (+ journal tag); additive (no CHECK); apply local.
- [x] T002 [P] `shared/social.ts`: `NOTABLE_MIN_INTERACTIONS` guard helper + reuse platform vocab;
  unit test additions in `tests/unit/social.test.ts` (validation surface stays in shared where pure).

## Phase 2 — Backend service + routes
- [x] T003 `worker/services/social.ts`: `addNotablePost`, `removeNotablePost`, `setPublic(kind,id,val,actor)`;
  extend `getSocial` to return `posts` + `public` flags; `publishSafeSocial(d1, talentId)`.
- [x] T004 `worker/routes/social.ts`: `POST /talent/:ref/social/posts`, `DELETE /social/posts/:id`,
  `PATCH /social/:kind/:id/public` (kind guard); Zod schemas (https, non-negative interactions, date).
- [x] T005 `worker/services/dashboard.ts`: `coverage` UNION-ALL (press + notable) newest-first, limit 12,
  speaker ref/name + `kind` + deep-link fields.
- [x] T006 [P] Unit `tests/unit/social.test.ts`: `publishSafeSocial` boundary — only public rows, only
  safe keys, no `*_by`/`*_set_at`/ids.

## Phase 3 — Frontend
- [x] T007 Types in `src/lib/types.ts`: `NotablePost`; `SocialData.posts` + per-row `public`;
  `DashboardData.coverage`.
- [x] T008 SocialTab (`src/routes/talent-profile.tsx`): Notable posts card (add dialog, list newest-first,
  remove); disabled "Connect · coming soon" on each profile; public/internal toggle on each row.
- [x] T009 Dashboard (`src/routes/dashboard.tsx`): "Roster in the news" Card, deep-links to `?tab=social`;
  activity labels for `notable_post_added/removed`, `visibility_changed`.

## Phase 4 — Tests, verify, ship
- [x] T010 Integration `tests/integration/social.test.ts` additions: notable CRUD + attribution; public
  toggle persists + attributed; dashboard coverage order + fields; publish-safe hides internal; talent
  shape exposes nothing.
- [x] T011 [P] e2e `tests/e2e/us-social-visibility.spec.ts`: add notable post → tab + dashboard; connect
  disabled; toggle item off.
- [x] T012 Full clean-DB verify (unit+integration+e2e+lint+typecheck); CHANGELOG + case-study; migrate
  remote 0012 + deploy; visual check; update memory.

## Dependencies
T001 → T002/T003 → T004/T005 → T007 → T008/T009 → T010/T011 → T012.
