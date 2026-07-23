# Quickstart & Validation: Talent Availability

## Prerequisites

```bash
cd app
pkill -9 -f wrangler; pkill -9 -f workerd
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local        # applies 0010_availability.sql
npm run seed:brand
npm run dev                     # http://localhost:8787 (dev identity = owner)
```

Open a speaker → **Availability** tab.

## Validation scenarios

1. **Calendar renders (US1, SC-001)** — a month grid (Mon-first) with a legend; Prev/Next changes
   the month.
2. **Block dates (US2, SC-002)** — "Block dates" over 18–19 Aug creates a red blocked range on both
   days; it appears in the "This month" list.
3. **Add a confirmed engagement (US2)** — add state=confirmed, title "Barclays Events", detail
   "Keynote", location "London", 12 Aug; the day turns blue and the list shows the entry with a
   Confirmed badge.
4. **Edit / remove (US2)** — edit an entry's state/detail; remove another; both surfaces update.
5. **Bad range (US2, SC-003)** — end before start is refused with a factual message.
6. **This month list (US3, SC-004)** — the list matches the calendar for the visible month, in date
   order, and follows Prev/Next.
7. **Working week (US4)** — set Mon–Sat; Sunday is de-emphasised; the setting persists.
8. **Precedence (edge)** — a confirmed and a blocked entry on the same day → the cell shows
   confirmed; the list shows both.
9. **Publish-safe (US5, SC-005)** — the publish-safe shape has no availability data.
10. **History (US5, SC-006)** — add/remove appear in History, attributed.

## Automated verification

```bash
npm run test:unit          # states/tones, precedence, month-grid + overlap maths
npm run test:integration   # CRUD, month filter, validation, publish-safe, change records
npx playwright test tests/e2e/us-availability.spec.ts
npm run lint && npm run typecheck
```

**Definition of done**: all three tiers green, lint + typecheck clean, publish-safe guard present,
calendar + list + Sync panel match the mockup (Google Calendar connect shown but inert).
