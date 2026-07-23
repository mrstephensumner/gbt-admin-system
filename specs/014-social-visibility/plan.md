# Plan: Social & News visibility (spec 014)

**Spec**: [spec.md](spec.md) · **Branch**: `014-social-visibility`

## Technical approach

Additive extension of the spec-007 social feature. No new architecture; reuses the Worker + D1 +
Drizzle + React stack (ADR 0002) and the publish-safe boundary principle (ADR 0004). No new ADR:
the `public` flag realises ADR 0004's "publish-safe fields only" interface — the first structured
publish-safe read the system exposes for talent-authored content.

## Data model (migration 0012, additive)

- New table **`talent_notable_post`**: `id`, `talent_id` (FK), `platform`, `url`, `caption`
  (nullable), `interactions` (integer), `posted_on` (text `YYYY-MM-DD`), `public` (integer, default
  1), `created_at`, `created_by`. Index on `(talent_id, posted_on)`.
- Add **`public`** (integer, default 1) to `talent_social_link` and `talent_press_mention`.
- Additive only — `ADD COLUMN` with a literal default, `CREATE TABLE`; no CHECK constraints (avoid
  SQLite full-table rebuild, per the 0008/0011 lesson). Non-negativity validated at the Zod layer.

## Backend

- **`shared/social.ts`** — add nothing structural beyond reuse; export a `NotablePostInput` shape is
  route-side. (Platform vocab + `formatFollowers` already exported.)
- **`worker/services/social.ts`** —
  - `addNotablePost`, `removeNotablePost` (attributed change records `notable_post_added/removed`).
  - `setPublic(kind, id, value, actor)` — toggles the flag on link/mention/post; change record
    `visibility_changed` with field naming the kind.
  - `getSocial` extended to also return `posts` and each row's `public` flag.
  - `publishSafeSocial(d1, talentId)` — the boundary read (FR-004).
- **`worker/routes/social.ts`** — `POST /talent/:ref/social/posts`, `DELETE /social/posts/:id`,
  `PATCH /social/:kind/:id/public` (kind ∈ links|mentions|posts).
- **`worker/services/dashboard.ts`** — add a `coverage` block: a UNION-ALL query over
  `talent_press_mention` and `talent_notable_post` joined to non-archived talent, ordered by item
  date desc, limit 12, each tagged `kind`.

## Frontend

- **`src/routes/talent-profile.tsx`** SocialTab — third card "Notable posts" (add dialog + list +
  remove); a disabled "Connect · coming soon" affordance on each profile row; a small public/internal
  toggle on each profile, mention, and post row.
- **`src/routes/dashboard.tsx`** — "Roster in the news" Card between attention lists and Recent
  activity; rows deep-link to `/talent/:ref?tab=social`.
- **`src/lib/types.ts`** — `NotablePost`, extend `SocialData` with `posts` + `public` flags;
  `DashboardData` gains `coverage`.

## Testing (Principle VI)

- **Unit** — notable-post validation (https, non-negative interactions, date shape); `publishSafeSocial`
  field boundary (given mixed rows, output contains only public rows and only safe keys).
- **Integration** — notable CRUD + attribution; public toggle persists + is attributed; dashboard
  coverage merges press + posts newest-first and deep-link fields present; publish-safe read hides
  internal rows/fields; talent serialization still exposes nothing.
- **e2e** — add a notable post → shows on tab and on the Dashboard feed; connect control is disabled;
  toggle an item off.

## Rollout

Migration 0012 additive; remote migrate + deploy; no secret/env changes. Branch off
`014-social-visibility` (chained from 013), PR based on `013-profile-enrichment`.

## Constitution gate

Passes I–VI (see spec). No violations; no Complexity Tracking entries.
