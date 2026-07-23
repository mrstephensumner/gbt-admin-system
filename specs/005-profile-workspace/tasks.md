# Tasks: Talent Profile Workspace

- [X] T001 Implement `app/worker/services/stats.ts` + `GET /api/talent/:reference/stats` (shared completeness definition; exact counts; status_since) and integration tests `app/tests/integration/stats.test.ts` (scripted-sequence exactness, FR-004/SC-002)
- [X] T002 Restructure `app/src/routes/talent-profile.tsx` into tabs (Profile/Photos/Site selector/Statistics/History; `?tab=` deep link; no placeholder tabs) with a Statistics tab UI (checklist, activity, facts) (FR-001/003/005)
- [X] T003 Update existing e2e locators for tabbed navigation; new e2e `app/tests/e2e/us-workspace.spec.ts` (tab journey, deep link, read-only site selector without grant, stats figures render); full suites green (SC-001)
- [X] T004 Visual pass vs mockup tab bar; docs sync (CHANGELOG, README); deploy
