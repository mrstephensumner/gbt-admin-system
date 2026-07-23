import { describe, expect, it } from 'vitest'
import { call, createTalent, seedBrand, uploadPhoto } from './helpers'

describe('profile statistics (spec 005 FR-004, SC-002)', () => {
  it('figures are exact for a scripted action sequence', async () => {
    await seedBrand()
    // Sequence: create (1 record) → photo (1) → status change (1) → field edit (1) → publish (1)
    const talent = await createTalent({ name: 'Stat Subject' })
    await uploadPhoto(talent.reference)
    const afterStatus = await call('POST', `/talent/${talent.reference}/status`, { status: 'on_hold', version: 1 })
    await call('PATCH', `/talent/${talent.reference}`, { version: afterStatus.body.version, headline: 'Edited' })
    const fresh = await call('GET', `/talent/${talent.reference}`)
    await call('POST', `/talent/${talent.reference}/publish`, {
      brand: 'great-british-speakers',
      version: fresh.body.version,
    })

    const { status, body } = await call('GET', `/talent/${talent.reference}/stats`)
    expect(status).toBe(200)

    const activity = body.activity as { total: number; last_30_days: number; by_action: Record<string, number> }
    expect(activity.by_action).toEqual({
      created: 1,
      photo_added: 1,
      status_changed: 1,
      field_changed: 1,
      published: 1,
    })
    expect(activity.total).toBe(5)
    expect(activity.last_30_days).toBe(5)

    const completeness = body.completeness as { publishable: boolean; missing: string[]; extended_missing: string[] }
    expect(completeness.publishable).toBe(true)
    expect(completeness.missing).toEqual([])
    expect(completeness.extended_missing).toEqual([]) // helper seeds headline/location/email

    const facts = body.facts as Record<string, unknown>
    expect(facts.status).toBe('on_hold')
    expect(facts.topics).toBe(1)
    expect(facts.photos).toBe(1)
    expect(facts.published_brands).toBe(1)
    expect(facts.created_by).toBe('test@greatbritishtalent.online')
  })

  it('completeness names exactly the publication gaps (shared definition)', async () => {
    const talent = await createTalent({ name: 'Gappy', day_rate_pence: null, biography: null })
    const { body } = await call('GET', `/talent/${talent.reference}/stats`)
    const completeness = body.completeness as { publishable: boolean; missing: string[] }
    expect(completeness.publishable).toBe(false)
    expect(completeness.missing.sort()).toEqual(['biography', 'day_rate', 'photo'])
  })

  it('status_since reflects the latest status change, else creation', async () => {
    const talent = await createTalent({ name: 'Since Subject' })
    const before = await call('GET', `/talent/${talent.reference}/stats`)
    expect((before.body.facts as { status_since: string }).status_since).toBe(
      (before.body.facts as { created_at: string }).created_at,
    )
    await call('POST', `/talent/${talent.reference}/status`, { status: 'booked', version: 1 })
    const after = await call('GET', `/talent/${talent.reference}/stats`)
    const facts = after.body.facts as { status: string; status_since: string; created_at: string }
    expect(facts.status).toBe('booked')
    expect(facts.status_since >= facts.created_at).toBe(true)
  })

  it('404s for unknown references', async () => {
    const { status } = await call('GET', '/talent/TAL-9999/stats')
    expect(status).toBe(404)
  })
})
