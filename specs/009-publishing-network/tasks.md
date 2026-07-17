# Tasks: Publishing Network

- [ ] T001 Migration 0007 (brand url/active/sort_order); `network` permission in shared/permissions (+unit test); serialize publications from active-or-published sites ordered
- [ ] T002 network service (list/create/edit/activate, slug-unique) + routes (GET /network, POST/PATCH behind requirePermission('network')); integration tests `tests/integration/network.test.ts` (CRUD, slug uniqueness, deactivate preserves publications, permission 403s, multi-site publish independence)
- [ ] T003 Network admin screen `src/routes/network.tsx` + permission-gated nav; rename profile 'Site selector' tab → 'Network'; Team screen toggle for network permission appears automatically
- [ ] T004 e2e (add a site → publish a talent to it via Network tab; permission-denied path); full suites on clean DB; migrate remote + deploy; docs sync
