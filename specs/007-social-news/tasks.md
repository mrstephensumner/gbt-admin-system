# Tasks: Social & News

- [ ] T001 `shared/social.ts` (platform vocabulary + labels, follower abbreviation via shared format) + unit tests; migration 0004 (talent_social_link, talent_press_mention); 4 change actions in shared enums
- [ ] T002 Service `worker/services/social.ts` + routes (5 endpoints, https validation, restamp semantics, history coupling); integration tests `tests/integration/social.test.ts`
- [ ] T003 Social & News tab UI in `src/routes/talent-profile.tsx` (replaces placeholder): profiles card + press card + total reach; describers updated (profile history + dashboard)
- [ ] T004 e2e in `tests/e2e/us-workspace.spec.ts`; full suites; migrate remote + deploy; docs sync
