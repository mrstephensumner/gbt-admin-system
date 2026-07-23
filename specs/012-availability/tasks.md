# Tasks: Talent Availability

**Feature**: `012-availability` | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Tests included (Constitution VI). Paths under `app/`.

## Phase 1 — Setup

- [ ] T001 Add `talentAvailability` table + `working_week` column on `talent` to
  `app/worker/db/schema.ts`; `npm run db:generate` → rename to `app/drizzle/0010_availability.sql`
  (+ journal tag); apply local. Keep it additive (no CHECK on the new column → no table rebuild).

## Phase 2 — Foundational

- [ ] T002 [P] Create `app/shared/availability.ts`: state keys/labels/tones, working-week options,
  `CELL_PRECEDENCE`, `cellState(entries)`, `entryCoversDate`, `buildMonthGrid(year, month)`
  (Monday-first weeks), `isWorkingDay(weekday, workingWeek)`.
- [ ] T003 [P] Unit tests `app/tests/unit/availability.test.ts`: state vocab (4 keys/tones),
  `cellState` precedence (confirmed>blocked>pencilled>available), `entryCoversDate` (range
  inclusive, month-spanning), `buildMonthGrid` (Mon-first, correct leading/trailing days),
  `isWorkingDay`.
- [ ] T004 Create `app/worker/services/availability.ts`: `listMonth(reference, month)` (overlap
  query + working_week), `createEntry`, `updateEntry`, `removeEntry`, `setWorkingWeek` — with
  range validation and change-record emission.

## Phase 3 — User Story 1: Month calendar (P1) 🎯 MVP

**Goal**: The tab shows a navigable month calendar with coloured/labelled entry days + legend.

**Independent test**: Open a speaker with entries → days coloured by state; Prev/Next works.

- [ ] T005 [US1] Add `GET /api/talent/:reference/availability` route (month param) → `listMonth`;
  wire the group in `app/worker/index.ts`.
- [ ] T006 [P] [US1] Add availability types to `app/src/lib/types.ts`.
- [ ] T007 [US1] Build the calendar in `app/src/routes/availability-tab.tsx`: month header +
  Prev/Next, Monday-first grid via `buildMonthGrid`, each day cell showing `cellState` colour +
  label, non-working days de-emphasised, and the legend. Design-system tokens/Badge tones/Lucide.
- [ ] T008 [US1] Replace the Availability `coming-soon` block in
  `app/src/routes/talent-profile.tsx` with `<AvailabilityTab>`.
- [ ] T009 [US1] Integration tests `app/tests/integration/availability.test.ts` (part 1): GET
  returns month-overlapping entries + working_week; a month-spanning entry appears in both months.

**Checkpoint**: A readable month calendar.

## Phase 4 — User Story 2: Add / edit / remove entries (P1)

**Goal**: Block dates, add engagements, edit and remove — reflected on calendar + list.

**Independent test**: Add a blocked range + a confirmed entry; edit one; remove one.

- [ ] T010 [US2] Add `POST` / `PATCH :id` / `DELETE :id` routes → service create/update/remove
  (validate state, title, `bad_range`).
- [ ] T011 [US2] Add/edit dialog in `availability-tab.tsx` (state select, title, detail, location,
  start/end date) + a "Block dates" button (defaults to blocked); clicking a day opens add-for-that-
  day; clicking an entry opens edit with a remove action.
- [ ] T012 [P] [US2] Integration tests (part 2): create/edit/remove round-trip; `bad_range` (end <
  start) refused; `missing_title` refused.

**Checkpoint**: The diary is maintainable by hand.

## Phase 5 — User Story 3: This-month list (P2)

**Goal**: A dated list of the visible month's entries with state badges, following the month.

**Independent test**: List matches the calendar for the month, date-ordered, follows Prev/Next.

- [ ] T013 [US3] Add the "This month" panel to `availability-tab.tsx` (date, title, detail ·
  location, state badge; date-ordered; derived from the same month entries).
- [ ] T014 [P] [US3] Integration/unit coverage that the list source equals the calendar source for a
  month (no divergence) — asserted via the shared entries payload.

**Checkpoint**: Calendar + list agree.

## Phase 6 — User Story 4: Working week (P2)

**Goal**: Set the default working week; non-working days de-emphasised; persists.

**Independent test**: Set Mon–Sat; Sunday de-emphasised; reload keeps it.

- [ ] T015 [US4] Add `PATCH /api/talent/:reference/availability/settings` → `setWorkingWeek`
  (validate; `working_week_changed` record).
- [ ] T016 [US4] Add the Sync panel to `availability-tab.tsx`: working-week `Select` (persists), and
  a **Connect Google Calendar** control clearly marked not-yet-active (disabled + "Coming soon").
- [ ] T017 [P] [US4] Integration test (part 3): setting persists + `bad_working_week` refused.

**Checkpoint**: Working week shapes the grid; Google connect is a signpost only.

## Phase 7 — User Story 5: Attribution + internal boundary (P2)

**Goal**: All changes attributed into History/dashboard/stats; nothing publish-safe.

**Independent test**: Add/remove appear in History; publish-safe shape has no availability data.

- [ ] T018 [US5] Ensure every service mutation writes a change record; add human-readable labels for
  `availability_added` / `availability_updated` / `availability_removed` / `working_week_changed` in
  the History tab and dashboard feed.
- [ ] T019 [US5] Confirm `app/worker/services/serialize.ts` excludes availability + working_week
  (assert/guard).
- [ ] T020 [P] [US5] Integration guard tests (part 4): publish-safe shape has no availability fields
  (SC-005); each mutation appears in History attributed (SC-006).

## Phase 8 — Polish & cross-cutting

- [ ] T021 [P] e2e `app/tests/e2e/us-availability.spec.ts`: calendar renders with legend; Block
  dates creates a red range; add a confirmed engagement (shows on calendar + list); set working
  week. (Clean-DB ritual; tab by exact name; unique names.)
- [ ] T022 [P] Update `CHANGELOG.md` + `docs/case-study.md` (note Google Calendar deferred).
- [ ] T023 Full verification on a clean DB (unit + integration + e2e + lint + typecheck); migrate
  remote (`0010`) + deploy; visual check vs the mockup.

## Dependencies & execution order

- Setup (T001) → Foundational (T002–T004) block all stories.
- US1 (T005–T009) is the MVP. US2 (T010–T012) depends on US1's tab shell + service. US3 (T013–T014)
  and US4 (T015–T017) build on the tab. US5 (T018–T020) depends on the write paths. Polish last.

## Parallel opportunities

- T002 ∥ T003. T006 ∥ within US1. Integration test tasks T012, T014, T017, T020 are `[P]`
  (distinct describe blocks). T021 ∥ T022.

## Implementation strategy

**MVP = Phases 1–2 + US1**: a readable month calendar. Then US2 (maintain entries), US3 (list),
US4 (working week + deferred Google connect), US5 (boundary), Polish.
