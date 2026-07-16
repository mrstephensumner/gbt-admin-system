# Implementation Plan: Talent Media Manager

**Branch**: `008-media-manager` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

## Summary
Extend `talent_photo` with a `category` column (migration 0005) and add
`talent_showreel` + `talent_seo` tables. Scope avatar/primary logic to headshots. New
change actions (showreel_added/removed, seo_updated). Media tab (own component) replaces
the Photos-tab content: Headshots · At events · Showreels sections + SEO sidebar.
Baseline permission; showreels are URLs (provider + thumbnail derivation in shared/media).

## Constitution Check
I ✅ · II ✅ · III ✅ existing components; provider thumbnails from public URLs · IV ✅ ·
V ✅ categories/providers/SEO limits in shared module · VI ✅ integration (category
scoping, avatar-is-headshot, showreel provider parse, SEO upsert, history coupling) +
e2e. No new deps. Complexity: none.

## Design
- Migration 0005: `talent_photo.category TEXT NOT NULL DEFAULT 'headshot'`;
  `talent_showreel` (id, talent_id, title, url, provider, created_at/by);
  `talent_seo` (talent_id PK, meta_title, meta_description, focus_keyword, updated_at/by).
- Photos route: accept `category` on upload; `is_primary` only for headshots; delete
  reassigns primary among headshots. Serialize photo `category`; avatar = primary headshot.
- `shared/media.ts`: PHOTO_CATEGORIES + labels; `videoProvider(url)` → provider + thumbnail.
- Routes: `GET /talent/:ref/media` (photos grouped + showreels + seo),
  `POST/DELETE /talent/:ref/showreels`, `PUT /talent/:ref/seo`.
- UI: `src/routes/media-tab.tsx` — three media sections + SEO sidebar; replaces the
  Photos tab body in the workspace.
