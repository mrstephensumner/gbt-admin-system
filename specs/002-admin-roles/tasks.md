# Tasks: Admin Roles & Operator Management

**Input**: Design documents from `/specs/002-admin-roles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included — constitution Principle VI; authorization demands a full permission
matrix test (spec SC-001) plus owner-invariant and revocation-immediacy proofs.

**Organization**: Grouped by user story. Paths relative to repo root; code in `app/`.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Permission vocabulary, schema, registry service, enforcement middleware

- [X] T001 [P] Implement `app/shared/permissions.ts` — permission area ids (`edit_day_rates`, `publish`, `archive`, `manage_topics`), labels, factual refusal messages, `can(operator, permission)` with owner short-circuit — plus exhaustive unit tests in `app/tests/unit/permissions.test.ts` (FR-006/007/012)
- [X] T002 Add `operator`, `operator_grant`, `operator_audit` tables to `app/worker/db/schema.ts` per data-model.md; generate migration `app/drizzle/0001_operators.sql`; add `OWNER_EMAIL` var to `app/wrangler.jsonc` + `app/.dev.vars` (dev owner = dev@greatbritishtalent.online) and regenerate types (`npm run cf-typegen`)
- [X] T003 Implement operators service `app/worker/services/operators.ts` — case-insensitive lookup, idempotent owner bootstrap from `OWNER_EMAIL` (audited `owner_bootstrapped`; config-error if registry empty and var unset), add/remove operator, replace grants (diff → audit rows, same batch), owner invariant on every mutation path (FR-001/002/004/005/009/010/011)
- [X] T004 Implement authorization middleware `app/worker/middleware/authorize.ts` — registry gate on all `/api/*` (403 `not_registered`), attach operator to context, `requirePermission(area)` guard helper; wire into `app/worker/index.ts` after identity; extend `GET /api/me` to return `{ email, role, grants }` (FR-003/007; research R1/R6)

**Checkpoint**: Registry + enforcement primitives exist

---

## Phase 2: User Story 1 — Only registered operators can use the admin (P1) 🎯

**Goal**: Signed-in ≠ authorised; unregistered identities get a factual notice and nothing else.

**Independent Test**: Owner works fully; Access-permitted stranger gets 403 everywhere + notice screen.

- [X] T005 [US1] Integration tests `app/tests/integration/authorization.test.ts` (part 1) — unregistered email 403 `not_registered` across every route family (reads included), owner bootstrap on first request (audited, idempotent), case-insensitive identity matching, `OWNER_EMAIL`-unset config error; set `OWNER_EMAIL` in vitest miniflare bindings so spec-001 suites keep passing via bootstrap
- [X] T006 [P] [US1] Build operator context `app/src/lib/operator.tsx` (from extended `/api/me`) and blocked-access screen `app/src/routes/no-access.tsx`; wire into `app/src/routes/root.tsx` (render notice when `not_registered`; show operator email/role in topbar)

**Checkpoint**: The registry gate is live end-to-end

---

## Phase 3: User Story 2 — Owner manages the operator list (P2)

**Goal**: Team screen — add/remove operators, see audit trail; owner cannot lock themselves out.

**Independent Test**: Add an email → they can work; remove → next request refused, history intact, audit complete.

- [X] T007 [US2] Implement team routes `app/worker/routes/team.ts` — `GET/POST /api/team/operators`, `DELETE /api/team/operators/:id`, `GET /api/team/audit` (owner-only) per contracts/api.md; integration tests `app/tests/integration/team.test.ts` incl. idempotent add, owner-removal 422, attribution survival after removal
- [X] T008 [US2] Build Team screen `app/src/routes/team.tsx` — operator table (email, role, grants, added by/at), add-operator dialog, remove confirmation naming the person, audit trail panel; owner-only nav item in `app/src/routes/root.tsx` (FR-004/012)
- [X] T009 [US2] Playwright journey `app/tests/e2e/us-roles.spec.ts` (part 1) — owner adds an operator, sees them listed, removes them; audit shows both events

**Checkpoint**: Owner administers access in-app

---

## Phase 4: User Story 3 — Per-operator permission limits (P3)

**Goal**: Grants enforced server-side on day rates, publication, archive, topics; UI hides what's not granted; revocation is immediate.

**Independent Test**: Publish-only operator can publish but nothing else gated; direct requests refused; toggle flips apply next request.

- [X] T010 [US3] Implement `PUT /api/team/operators/:id/grants` (diff → audit) in `app/worker/routes/team.ts`; apply `requirePermission` guards to publish/unpublish, archive/restore, topic rename/merge routes; field-level `edit_day_rates` check in `app/worker/services/talent.ts` update path (whole request refused, research R5) (FR-006/007)
- [X] T011 [US3] Integration tests `app/tests/integration/authorization.test.ts` (part 2) — full permission matrix (each gated action × with/without grant, direct requests), grant-set replace semantics, revocation-immediacy, owner bypass, unknown-area 400, owner-grants-edit 422
- [X] T012 [P] [US3] UI gating — grant toggles (Switch) on the Team screen; `app/src/routes/talent-profile.tsx` (day-rate read-only, publish/archive controls hidden without grants), `app/src/routes/topics.tsx` (rename/merge hidden without `manage_topics`), driven by the operator context (FR-007)
- [X] T013 [US3] Playwright journey `app/tests/e2e/us-roles.spec.ts` (part 2) — limited operator (publish only): UI shows no archive button + read-only day rate, publish works; owner revokes publish → operator's next attempt refused without re-login

**Checkpoint**: All three spec stories complete

---

## Phase 5: Polish & Rollout

- [X] T014 Full local validation per quickstart.md (all suites + manual journeys); visual pass of Team/no-access screens against the design system; docs sync — `docs/deployment.md` OWNER_EMAIL rollout note, README status, CHANGELOG (constitution Principle II)
- [X] T015 Production rollout — confirm Stephen's exact Access email (shown at /api/me on the live site), set `OWNER_EMAIL` in `app/wrangler.jsonc`, `npm run db:migrate:remote`, deploy, verify owner bootstrap + a second (unregistered) identity is refused — **DONE 16 Jul 2026: deployed with OWNER_EMAIL=hello@localseo.agency; edge + Worker gates verified; owner bootstraps on Stephen's first sign-in**

---

## Dependencies

```text
Phase 1 (T001–T004) ──▶ US1 (T005–T006) ──▶ US2 (T007–T009) ──▶ US3 (T010–T013) ──▶ Polish (T014–T015)
```

Sequential by design — each story builds directly on the previous. Parallel opportunities
within phases: T001 alongside T002; T006 alongside T005; T012 alongside T011.

## Implementation Strategy

Foundational + US1 is the security-meaningful MVP (registry gate). US2 and US3 land as
independently testable increments. T015 pauses for one human input: the exact owner
email as reported by Cloudflare Access.
