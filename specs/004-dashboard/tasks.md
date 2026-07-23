# Tasks: Operations Dashboard

**Input**: Design documents from `/specs/004-dashboard/`

**Tests**: Included (constitution Principle VI — count-equality proofs are the core).

- [X] T001 Implement `app/worker/services/dashboard.ts` (SQL aggregations; shared completeness predicate with the publication gate) + `GET /api/dashboard` route wired at baseline permission (FR-002/004/005/006)
- [X] T002 Integration tests `app/tests/integration/dashboard.test.ts` — KPI ↔ directory-count equality across statuses/brands/topics; attention-list membership + missing labels incl. archived exclusion; activity order/attribution; zero-state shape
- [X] T003 Build `app/src/routes/dashboard.tsx` — StatCard grid (status/brand tiles link to filtered directory), Ready-to-publish + Blocked cards with see-all counts, activity feed, purposeful empty state (FR-001/003/007)
- [X] T004 Re-route: `/` → Dashboard, `/speakers` → Directory; nav updated; existing e2e specs updated for `/speakers`; new e2e `app/tests/e2e/us-dashboard.spec.ts` (landing, tile-link filter, attention row → profile, activity link)
- [X] T005 Full suites + visual pass vs handoff Dashboard; docs sync (README, CHANGELOG); deploy to production

## Dependencies

T001 → T002 → (T003 ∥) → T004 → T005 (compact feature — sequential is fine)
