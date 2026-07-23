# API Contracts: Talent Onboarding System

All endpoints are under the Access-gated admin API. Error envelope is the project standard:
`{ error: { code, message }, ...extras }`. Reference is the `TAL-` public reference.

## GET `/api/talent/:reference/onboarding`

Read the checklist for a speaker. Any registered operator.

**200**:
```json
{
  "steps": [
    { "key": "rep_agreement", "title": "Representation agreement", "descriptor": "Signed & countersigned",
      "order": 1, "requiredToPublish": false, "status": "complete", "blocksPublish": false,
      "note": "Countersigned 12-07-2026", "actor": "jo@…", "at": "2026-07-12T09:00:00Z" },
    { "key": "headshots", "title": "Headshots & showreel", "descriptor": "Min. 3 hi-res images",
      "order": 4, "requiredToPublish": true, "status": "complete", "blocksPublish": false },
    { "key": "fee_schedule", "title": "Fee schedule", "descriptor": "Day rate & travel terms",
      "order": 6, "requiredToPublish": true, "status": "in_progress", "blocksPublish": true }
  ],
  "progress": { "complete": 5, "applicable": 7, "percent": 71 },
  "fee": {
    "day_rate_pence": 400000, "half_day_rate_pence": 250000,
    "after_dinner_rate_pence": 320000, "travel_terms": "Billed at cost", "fees_vary_by_site": true
  }
}
```

- `status` for derived steps is computed; for attestation steps is read from
  `talent_onboarding_step`.
- `blocksPublish = requiredToPublish && status !== 'complete'`.
- `404 not_found` if no such reference.

## PUT `/api/talent/:reference/onboarding/:stepKey`

Set an **attestation** step's status. Any registered operator. Writes a change record.

**Request**:
```json
{ "status": "complete", "note": "Passport checked, held in file", "version": 7 }
```
- `status` ∈ `in_progress` | `complete` | `not_applicable`.
- `note` optional, short free text; attestation steps only.
- `version` is the talent record version for optimistic concurrency (FR-020).

**200**: the updated onboarding read shape (as GET).

**Errors**:
- `400 bad_step` — `stepKey` is not an attestation step (derived steps cannot be set directly;
  message directs the operator to the owning tab, e.g. "Headshots complete when photos are
  added in the Photos tab").
- `400 bad_status` — status not in the allowed set, or `not_applicable` on a publish-required
  step.
- `409 version_conflict` — record changed while editing (returns current state).
- `404 not_found`.

**Change record**: `onboarding_step_completed` (→complete), `onboarding_step_reverted`
(complete→in_progress/not_started), or `onboarding_step_na` (→not_applicable); `field` = step_key.

## PATCH `/api/talent/:reference/fee-schedule`

Update the fee schedule. Requires **`edit_day_rates`** permission. Writes a change record.

**Request** (all fields optional; partial update):
```json
{
  "day_rate_pence": 400000, "half_day_rate_pence": 250000,
  "after_dinner_rate_pence": 320000, "travel_terms": "London included, elsewhere at cost",
  "fees_vary_by_site": true, "version": 7
}
```
- `*_pence` values ≥ 0, or `null` to clear; `day_rate_pence` writes the existing standard
  day-rate field (single source).
- `travel_terms` free text (nullable).
- `fees_vary_by_site` boolean.

**200**: the updated onboarding read shape (includes recomputed `fee_schedule` step status and
progress — setting a day rate can complete the Fee schedule step and clear a publish blocker).

**Errors**:
- `403 forbidden` — operator lacks `edit_day_rates`
  (message: "You don't have permission to edit day rates — ask the owner").
- `409 version_conflict`.
- `422 bad_amount` — a negative pence value.
- `404 not_found`.

**Change record**: `fee_updated`; `field` names the changed fee(s).

## Publish gate (existing endpoint, reconciled — not new)

`POST /api/talent/:reference/publish` continues to refuse with `422 incomplete_for_publication`
and `{ missing: [...] }`, but the `missing` list is now produced by the shared
`publishBlockers()` helper — identical values and messages as today. The onboarding checklist's
`blocksPublish` flags derive from the same helper, guaranteeing parity (FR-006, SC-003).

## Publish-safe exclusion contract (FR-014 / SC-005)

No onboarding field — step statuses, notes, attesting operators, `half_day_rate_pence`,
`after_dinner_rate_pence`, `travel_terms`, `fees_vary_by_site` — appears in any publish-safe /
public serialization of a speaker. Enforced by an integration guard test over the publish-safe
shape.
