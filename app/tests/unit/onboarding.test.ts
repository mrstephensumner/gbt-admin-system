import { describe, expect, it } from 'vitest'
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_COUNT,
  STEP_BLOCKER,
  computeProgress,
  getStepDef,
  isAttestationStep,
  publishBlockers,
} from '@shared/onboarding'

describe('onboarding step definitions (spec 010)', () => {
  it('is a fixed set of seven steps in canonical order', () => {
    expect(ONBOARDING_STEP_COUNT).toBe(7)
    expect(ONBOARDING_STEPS.map((s) => s.key)).toEqual([
      'rep_agreement', 'identity', 'bank_details', 'headshots', 'biography', 'fee_schedule', 'safeguarding',
    ])
    expect(ONBOARDING_STEPS.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('marks exactly headshots, biography and fee_schedule as required to publish (owner clarify decision)', () => {
    const required = ONBOARDING_STEPS.filter((s) => s.requiredToPublish).map((s) => s.key)
    expect(required.sort()).toEqual(['biography', 'fee_schedule', 'headshots'])
  })

  it('treats the four compliance steps as attestation and the three publish steps as derived', () => {
    expect(['rep_agreement', 'identity', 'bank_details', 'safeguarding'].every(isAttestationStep)).toBe(true)
    expect(['headshots', 'biography', 'fee_schedule'].some(isAttestationStep)).toBe(false)
  })

  it('every publish-required step maps to a gate blocker token', () => {
    for (const s of ONBOARDING_STEPS.filter((s) => s.requiredToPublish)) {
      expect(STEP_BLOCKER[s.key]).toBeTruthy()
    }
  })

  it('getStepDef resolves known keys and rejects unknown', () => {
    expect(getStepDef('fee_schedule')?.title).toBe('Fee schedule')
    expect(getStepDef('nope')).toBeUndefined()
  })
})

describe('publishBlockers — single source for the publish gate (FR-006)', () => {
  const full = { day_rate_pence: 400000, biography: 'A bio.' }

  it('returns nothing when photo, biography and day rate are present', () => {
    expect(publishBlockers(full, 1)).toEqual([])
  })
  it('flags a missing photo', () => {
    expect(publishBlockers(full, 0)).toEqual(['photo'])
  })
  it('flags a missing biography', () => {
    expect(publishBlockers({ ...full, biography: '   ' }, 1)).toEqual(['biography'])
  })
  it('flags a missing/zero day rate', () => {
    expect(publishBlockers({ ...full, day_rate_pence: null }, 1)).toEqual(['day_rate'])
    expect(publishBlockers({ ...full, day_rate_pence: 0 }, 1)).toEqual(['day_rate'])
  })
  it('flags all three when the record is empty, in the canonical gate order', () => {
    expect(publishBlockers({ day_rate_pence: null, biography: null }, 0)).toEqual(['day_rate', 'biography', 'photo'])
  })
})

describe('computeProgress', () => {
  it('counts complete over applicable and rounds the percentage', () => {
    expect(computeProgress(['complete', 'complete', 'not_started'])).toEqual({ complete: 2, applicable: 3, percent: 67 })
  })
  it('excludes not-applicable steps from the applicable total (FR-015)', () => {
    expect(computeProgress(['complete', 'not_applicable', 'not_started'])).toEqual({ complete: 1, applicable: 2, percent: 50 })
  })
  it('is 0% (not NaN) when nothing is applicable', () => {
    expect(computeProgress(['not_applicable', 'not_applicable'])).toEqual({ complete: 0, applicable: 0, percent: 0 })
  })
  it('is 100% when all applicable steps are complete', () => {
    expect(computeProgress(['complete', 'complete'])).toEqual({ complete: 2, applicable: 2, percent: 100 })
  })
})
