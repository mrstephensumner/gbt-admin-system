# Tasks: Talent Media Manager

- [X] T001 `shared/media.ts` (photo categories + labels, videoProvider/thumbnail, SEO limits) + unit tests; migration 0005 (photo.category, talent_showreel, talent_seo); change actions (showreel_added/removed, seo_updated)
- [X] T002 Photos route: category on upload + headshot-scoped primary/avatar (serialize category); media service+routes (grouped media GET, showreel add/remove, seo upsert); integration tests `tests/integration/media.test.ts` (avatar-is-headshot SC-001, provider parse, seo upsert, history)
- [X] T003 `src/routes/media-tab.tsx` (Headshots/At events/Showreels + SEO sidebar) replacing the Photos-tab body; describers for new actions
- [X] T004 e2e in `tests/e2e/us-workspace.spec.ts`; full suites; migrate remote + deploy; docs sync
