# Implementation Plan: Social & News

**Branch**: `007-social-news` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

## Summary
Two tables (`talent_social_link`, `talent_press_mention`, migration 0004), a platform
vocabulary in `shared/social.ts` (labels + icons mapping lives UI-side), five endpoints,
and the Social & News tab replacing its placeholder. Four new change-history actions
(social_link_added/removed, press_mention_added/removed) flow into History, the
dashboard feed, and Statistics automatically. Baseline permission; no new dependencies.

## Constitution Check
I ✅ · II ✅ (changelog/docs in-commit) · III ✅ existing components; platform icons from
Lucide · IV ✅ brand-neutral · V ✅ platform vocabulary + follower formatting in shared
modules · VI ✅ integration tests (validation, totals, restamping, ordering, history
coupling) + e2e journey. Complexity: none.

## Design
- `GET /api/talent/:reference/social` → `{ links: [...], mentions: [...], total_followers }`
- `POST /api/talent/:reference/social/links` `{ platform, url, handle?, followers? }`
- `PATCH /api/social/links/:id` `{ followers?, url?, handle? }` (restamps set-at/by when followers present)
- `DELETE /api/social/links/:id`
- `POST /api/talent/:reference/social/mentions` `{ title, outlet, url, published_on }`
- `DELETE /api/social/mentions/:id`
- Tab UI: Social profiles card (platform icon, handle→link, follower figure + "as of",
  inline count update, add dialog, remove) + Press & news card (newest-first by
  published_on, add dialog, remove) + total-reach headline.
