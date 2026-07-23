import { describe, expect, it } from 'vitest'
import { call, createTalent, history, seedBrand, uploadPhoto } from './helpers'

const COLLEAGUE = 'colleague@example.com'

type Step = { key: string; status: string; blocksPublish: boolean; requiredToPublish: boolean; actor?: string; at?: string; note?: string | null }
type Onboarding = { steps: Step[]; progress: { complete: number; applicable: number; percent: number }; fee: Record<string, unknown> }

async function getOnboarding(reference: string): Promise<Onboarding> {
  const { body } = await call('GET', `/talent/${reference}/onboarding`)
  return body as unknown as Onboarding
}

describe('onboarding checklist read (spec 010 US1)', () => {
  it('derives publish-step completion from existing data and lists attestation steps as not started', async () => {
    const t = await createTalent() // has biography + day rate
    await uploadPhoto(t.reference)
    const ob = await getOnboarding(t.reference)

    expect(ob.steps.map((s) => s.key)).toHaveLength(7)
    const byKey = Object.fromEntries(ob.steps.map((s) => [s.key, s]))
    expect(byKey.headshots!.status).toBe('complete')
    expect(byKey.biography!.status).toBe('complete')
    expect(byKey.fee_schedule!.status).toBe('complete')
    expect(byKey.rep_agreement!.status).toBe('not_started')
    // three derived complete, four attestation not started → 3/7
    expect(ob.progress).toEqual({ complete: 3, applicable: 7, percent: 43 })
  })
})

describe('attestation steps (US1/US4)', () => {
  it('completes and reopens an attestation step, attributed', async () => {
    const t = await createTalent()
    const done = await call('PUT', `/talent/${t.reference}/onboarding/rep_agreement`, { status: 'complete', note: 'Countersigned', version: t.version })
    expect(done.status).toBe(200)
    const step = (done.body as unknown as Onboarding).steps.find((s) => s.key === 'rep_agreement')!
    expect(step.status).toBe('complete')
    expect(step.actor).toBeTruthy()
    expect(step.at).toBeTruthy()
    expect(step.note).toBe('Countersigned')

    // version bumped by the write — refetch record for the new version
    const rec = await call('GET', `/talent/${t.reference}`)
    const v = (rec.body as { version: number }).version
    const reopened = await call('PUT', `/talent/${t.reference}/onboarding/rep_agreement`, { status: 'in_progress', version: v })
    expect((reopened.body as unknown as Onboarding).steps.find((s) => s.key === 'rep_agreement')!.status).toBe('in_progress')
  })

  it('refuses to set a derived step directly (bad_step)', async () => {
    const t = await createTalent()
    const bad = await call('PUT', `/talent/${t.reference}/onboarding/headshots`, { status: 'complete', version: t.version })
    expect(bad.status).toBe(400)
    expect((bad.body.error as { code: string }).code).toBe('bad_step')
  })

  it('marks an optional attestation step not applicable and drops it from the total (FR-015)', async () => {
    const t = await createTalent()
    await uploadPhoto(t.reference)
    const na = await call('PUT', `/talent/${t.reference}/onboarding/safeguarding`, { status: 'not_applicable', version: t.version })
    const ob = na.body as unknown as Onboarding
    expect(ob.steps.find((s) => s.key === 'safeguarding')!.status).toBe('not_applicable')
    expect(ob.progress.applicable).toBe(6) // 7 minus the N/A step
  })

  it('rejects a stale version (optimistic concurrency, FR-020)', async () => {
    const t = await createTalent()
    const stale = await call('PUT', `/talent/${t.reference}/onboarding/identity`, { status: 'complete', version: t.version + 5 })
    expect(stale.status).toBe(409)
  })
})

describe('publish gate parity (US2, SC-002/003)', () => {
  it('the checklist blocks exactly what the publish action refuses, and clears together', async () => {
    await seedBrand()
    const t = await createTalent({ day_rate_pence: null }) // missing the fee
    await uploadPhoto(t.reference)

    const ob = await getOnboarding(t.reference)
    const blocking = ob.steps.filter((s) => s.blocksPublish).map((s) => s.key)
    expect(blocking).toEqual(['fee_schedule'])

    const refused = await call('POST', `/talent/${t.reference}/publish`, { brand: 'great-british-speakers', version: t.version })
    expect(refused.status).toBe(422)
    expect(refused.body.missing).toEqual(['day_rate'])

    // set the day rate via the fee schedule → fee step completes, blocker clears
    await call('PATCH', `/talent/${t.reference}/fee-schedule`, { day_rate_pence: 500000, version: t.version })
    const ob2 = await getOnboarding(t.reference)
    expect(ob2.steps.filter((s) => s.blocksPublish)).toHaveLength(0)

    const rec = await call('GET', `/talent/${t.reference}`)
    const ok = await call('POST', `/talent/${t.reference}/publish`, { brand: 'great-british-speakers', version: (rec.body as { version: number }).version })
    expect(ok.status).toBe(200)
  })
})

describe('fee schedule (US3)', () => {
  it('persists all fees, treats standard rate as the single day-rate source', async () => {
    const t = await createTalent({ day_rate_pence: null })
    await call('PATCH', `/talent/${t.reference}/fee-schedule`, {
      day_rate_pence: 400000, half_day_rate_pence: 250000, after_dinner_rate_pence: 320000,
      travel_terms: 'London included, elsewhere at cost', fees_vary_by_site: true, version: t.version,
    })
    const ob = await getOnboarding(t.reference)
    expect(ob.fee).toMatchObject({ day_rate_pence: 400000, half_day_rate_pence: 250000, after_dinner_rate_pence: 320000, travel_terms: 'London included, elsewhere at cost', fees_vary_by_site: true })
    // standard rate is the same field the record uses everywhere
    const rec = await call('GET', `/talent/${t.reference}`)
    expect((rec.body as { day_rate_pence: number }).day_rate_pence).toBe(400000)
  })

  it('requires edit_day_rates and refuses negative amounts', async () => {
    const t = await createTalent()
    await call('POST', '/team/operators', { email: COLLEAGUE }) // no grants
    const denied = await call('PATCH', `/talent/${t.reference}/fee-schedule`, { half_day_rate_pence: 100000, version: t.version }, COLLEAGUE)
    expect(denied.status).toBe(403)
    expect((denied.body.error as { message: string }).message).toBe("You don't have permission to edit day rates — ask the owner")

    const bad = await call('PATCH', `/talent/${t.reference}/fee-schedule`, { half_day_rate_pence: -1, version: t.version })
    expect(bad.status).toBe(422)
    expect((bad.body.error as { code: string }).code).toBe('bad_amount')
  })
})

describe('publish-safe boundary (US4, SC-004/005)', () => {
  it('no onboarding or fee-internal field leaks into the talent record shape', async () => {
    const t = await createTalent()
    await call('PATCH', `/talent/${t.reference}/fee-schedule`, { half_day_rate_pence: 250000, travel_terms: 'At cost', version: t.version })
    const rec = await call('GET', `/talent/${t.reference}`)
    const keys = Object.keys(rec.body)
    for (const leaked of ['half_day_rate_pence', 'after_dinner_rate_pence', 'travel_terms', 'fees_vary_by_site', 'onboarding', 'steps']) {
      expect(keys).not.toContain(leaked)
    }
  })
})

describe('attribution & history (US5, SC-007)', () => {
  it('writes attributed change records for step and fee changes', async () => {
    const t = await createTalent()
    await call('PUT', `/talent/${t.reference}/onboarding/identity`, { status: 'complete', version: t.version })
    const rec = await call('GET', `/talent/${t.reference}`)
    await call('PATCH', `/talent/${t.reference}/fee-schedule`, { half_day_rate_pence: 250000, version: (rec.body as { version: number }).version })

    const actions = (await history(t.reference)).map((h) => h.action)
    expect(actions).toContain('onboarding_step_completed')
    expect(actions).toContain('fee_updated')
  })
})
