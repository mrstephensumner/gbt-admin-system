# Quickstart & Validation: Talent Onboarding System

Run guide and end-to-end validation scenarios. Assumes the standard local setup.

## Prerequisites

```bash
cd app
# Clean local D1 + fresh schema + brands (avoids polluted-DB flakiness)
pkill -9 -f wrangler; pkill -9 -f workerd
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local        # applies 0008_onboarding.sql
npm run seed:brand
```

## Run

```bash
npm run dev        # Worker + SPA on http://localhost:8787 (dev identity = owner)
```

Open a speaker profile → **Onboarding** tab.

## Validation scenarios

### 1. Checklist renders with real progress (US1, SC-001)
- Open a speaker with a photo, a biography, and a day rate set.
- **Expect**: seven steps listed; Headshots, Biography & topics, Fee schedule show complete
  (derived); attestation steps show not started; progress summary and percentage bar reflect the
  counts; selecting a step shows its detail with "Step X of 7" and the publish flag.

### 2. Attest a step (US1/US4)
- Select "Identity & right to work" → mark verified, add a note → Save.
- **Expect**: step shows complete with the operator + day-month-year stamp; progress increments;
  no field exists for a raw passport number.

### 3. Gate parity — publish blocked then allowed (US2, SC-002/003)
- Take a speaker with **no day rate**. Onboarding shows Fee schedule as blocking (red flag).
- Attempt to publish (Network tab) → refused, message names the missing day rate.
- Set a day rate via the Fee schedule step → Fee schedule step completes, blocker clears.
- Publish → succeeds.
- **Expect**: the checklist's blocking flags and the publish refusal always agree (same
  `publishBlockers` source).

### 4. Fee permission (US3, SC-006)
- As an operator **without** `edit_day_rates`: open Fee schedule → fields read-only; a direct
  `PATCH /fee-schedule` returns `403`.
- As owner / an operator **with** `edit_day_rates`: edit rates + free-text travel terms + toggle
  "fees vary by site" → saves; standard day rate matches the value shown elsewhere on the record.

### 5. Publish-safe exclusion (US4, SC-005)
- Inspect the publish-safe serialization of the speaker (integration test / serializer output).
- **Expect**: no onboarding step data, notes, attesting operators, or fee internals
  (half-day/after-dinner/travel-terms/fees-vary) present.

### 6. Attribution & history (US5, SC-007)
- After steps 2–4, open the History tab and the dashboard activity feed.
- **Expect**: `onboarding_step_completed` and `fee_updated` events appear, attributed with
  day-month-year timestamps.

### 7. Not-applicable (edge case, FR-015)
- Mark "Safeguarding & compliance" not-applicable.
- **Expect**: excluded from the "X of N complete" total; cannot be applied to a publish-required
  step (attempt returns `400`).

## Automated verification

```bash
npm run test:unit          # onboarding step defs, progress maths, publishBlockers
npm run test:integration   # endpoints, gate parity, permission gating, publish-safe guard, change records
npx playwright test tests/e2e/us-onboarding.spec.ts
npm run lint && npm run typecheck
```

**Definition of done**: all three tiers green, lint + typecheck clean, gate-parity and
publish-safe guard tests present and passing, tab visually matches the mockup.
