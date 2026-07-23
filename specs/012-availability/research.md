# Research: Talent Availability

The mockup settled the shape. This records the integration/modelling decisions.

## R1 — State vocabulary

- **Decision**: Four fixed states with keys `available | pencilled | confirmed | blocked`, labels
  Available / Pencilled / Confirmed / Blocked, tones success / warning / info / danger (green /
  yellow / blue / red — mapping onto the existing `BadgeTone`). Used consistently on cells,
  badges and the legend.
- **Rationale**: The mockup's legend is the definitional key; its day cells used casual synonyms
  (Hold/Booked/Unavailable). Standardising on the legend words gives one fixed vocabulary
  (Constitution V) and avoids collision with the talent overall-status vocabulary
  (available/on_hold/booked/confirmed/cancelled), which is a *different* concept.
- **Alternatives**: Reuse the talent-status vocabulary — rejected; conflates two distinct ideas
  (a speaker's current status vs a dated diary entry) and would overload words like "booked".

## R2 — Date model & month query

- **Decision**: Entries are all-day date ranges — `start_date` and `end_date` as `YYYY-MM-DD`
  strings, inclusive, `end_date >= start_date`. The month view queries entries that **overlap** the
  visible month: `start_date <= <monthEnd> AND end_date >= <monthStart>`.
- **Rationale**: Speaking engagements are whole-day; string dates sort and compare correctly in
  SQLite and avoid timezone hazards. Overlap (not containment) so multi-day and month-spanning
  entries appear in every month they touch.
- **Alternatives**: Timestamps with times — unnecessary complexity for v1; a row per day — wasteful.

## R3 — Cell precedence

- **Decision**: When multiple entries cover one day, the grid cell shows one state by precedence
  **confirmed > blocked > pencilled > available**; the "This month" list shows every entry.
- **Rationale**: A firm booking should dominate the cell; an explicit block should beat a tentative
  hold; the list gives the full detail. Pure function, unit-tested.

## R4 — Working-week storage

- **Decision**: A `working_week` text column on `talent` (values like `mon_fri`, `mon_sat`,
  `all`); app default `mon_fri` when null. Non-working days are de-emphasised in the grid (pure
  presentation).
- **Rationale**: 1:1 with a talent, tiny, additive `ADD COLUMN` (no CHECK → no table rebuild, like
  spec 007/009). A separate settings table is unwarranted for one value.
- **Alternatives**: A settings table — over-engineered for a single field.

## R5 — Google Calendar deferral

- **Decision**: Render the **Connect Google Calendar** control as clearly not-yet-active (disabled,
  "Coming soon"); no OAuth, tokens or sync in v1.
- **Rationale**: Two-way Google sync (OAuth consent, token refresh, change propagation, conflict
  handling) is a substantial standalone feature; the mockup's control is a signpost. Mirrors the
  spec 007 deferral of social-API sync.

## R6 — Change records & publish-safe

- **Decision**: Actions `availability_added` / `availability_updated` / `availability_removed` /
  `working_week_changed` on the existing `change_record`, `field` = the entry title or "working
  week", flowing into History/dashboard/statistics. No availability data in `serializeTalent` or any
  public shape (guard test).
- **Rationale**: Matches the spec 004/005/006 fabric and the internal-only boundary of prior specs.
