import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTalent, seedBrand, uploadPhoto } from './helpers'

const BRAND = 'great-british-speakers'

describe('publication (US4, FR-009/010/011)', () => {
  beforeEach(async () => {
    await seedBrand()
    await seedBrand('great-british-presenters', 'Great British Presenters')
  })

  it('new records are unpublished for every brand (US4-S1)', async () => {
    const talent = await createTalent()
    const { body } = await call('GET', `/talent/${talent.reference}`)
    const pubs = body.publications as { brand: string; published: boolean }[]
    expect(pubs).toHaveLength(2)
    expect(pubs.every((p) => !p.published)).toBe(true)
  })

  it('blocks publication with the exact missing list and factual message (US4-S2)', async () => {
    const talent = await createTalent({ day_rate_pence: null, biography: null })
    const { status, body } = await call('POST', `/talent/${talent.reference}/publish`, {
      brand: BRAND,
      version: 1,
    })
    expect(status).toBe(422)
    expect((body.error as { code: string }).code).toBe('incomplete_for_publication')
    expect((body.error as { message: string }).message).toBe('Add a day rate before publishing')
    expect(body.missing).toEqual(['day_rate', 'biography', 'photo'])
  })

  it('publishes a complete record to one brand only, with who/when (US4-S3)', async () => {
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const { status, body } = await call('POST', `/talent/${talent.reference}/publish`, {
      brand: BRAND,
      version: 1,
    })
    expect(status).toBe(200)
    const pubs = body.publications as { brand: string; published: boolean; published_by?: string }[]
    const gbs = pubs.find((p) => p.brand === BRAND)!
    const other = pubs.find((p) => p.brand !== BRAND)!
    expect(gbs.published).toBe(true)
    expect(gbs.published_by).toBe('test@greatbritishtalent.online')
    expect(other.published).toBe(false)
  })

  it('unpublishes reversibly and records both changes (US4-S4)', async () => {
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const pub = await call('POST', `/talent/${talent.reference}/publish`, { brand: BRAND, version: 1 })
    const unpub = await call('POST', `/talent/${talent.reference}/unpublish`, {
      brand: BRAND,
      version: pub.body.version,
    })
    expect(unpub.status).toBe(200)
    const pubs = unpub.body.publications as { brand: string; published: boolean }[]
    expect(pubs.find((p) => p.brand === BRAND)!.published).toBe(false)

    const { body: hist } = await call('GET', `/talent/${talent.reference}/history`)
    const actions = (hist.items as { action: string }[]).map((e) => e.action)
    expect(actions).toContain('published')
    expect(actions).toContain('unpublished')
  })

  it('refuses to publish an archived record', async () => {
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const archived = await call('POST', `/talent/${talent.reference}/archive`, { version: 1 })
    const { status, body } = await call('POST', `/talent/${talent.reference}/publish`, {
      brand: BRAND,
      version: archived.body.version,
    })
    expect(status).toBe(422)
    expect((body.error as { code: string }).code).toBe('archived_record')
  })

  it('rejects an unknown brand', async () => {
    const talent = await createTalent()
    const { status } = await call('POST', `/talent/${talent.reference}/publish`, {
      brand: 'no-such-brand',
      version: 1,
    })
    expect(status).toBe(400)
  })
})
