import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTalent, history, seedBrand, uploadPhoto } from './helpers'

const BRAND = 'great-british-speakers'

describe('archive & restore (US5, FR-012)', () => {
  beforeEach(() => seedBrand())

  it('archives a published record, auto-unpublishing it with change records', async () => {
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const pub = await call('POST', `/talent/${talent.reference}/publish`, { brand: BRAND, version: 1 })

    const res = await call('POST', `/talent/${talent.reference}/archive`, { version: pub.body.version })
    expect(res.status).toBe(200)
    expect(res.body.archived).toBe(true)
    const pubs = res.body.publications as { published: boolean }[]
    expect(pubs.every((p) => !p.published)).toBe(true)

    const h = await history(talent.reference)
    expect(h.some((e) => e.action === 'archived')).toBe(true)
    expect(h.some((e) => e.action === 'unpublished' && e.old_value === BRAND)).toBe(true)
  })

  it('archived records keep their data and leave the default directory', async () => {
    const talent = await createTalent({ name: 'Archive Me' })
    await call('POST', `/talent/${talent.reference}/archive`, { version: 1 })

    const active = await call('GET', '/talent?q=Archive')
    expect(active.body.total).toBe(0)

    const { body } = await call('GET', `/talent/${talent.reference}`)
    expect(body.name).toBe('Archive Me')
    expect(body.archived).toBe(true)
  })

  it('restores with status reset to available (US5-S3)', async () => {
    const talent = await createTalent()
    await call('POST', `/talent/${talent.reference}/status`, { status: 'booked', version: 1 })
    const archived = await call('POST', `/talent/${talent.reference}/archive`, { version: 2 })
    const restored = await call('POST', `/talent/${talent.reference}/restore`, { version: archived.body.version })
    expect(restored.status).toBe(200)
    expect(restored.body.archived).toBe(false)
    expect(restored.body.status).toBe('available')
  })

  it('exposes no permanent-delete verb for talent (US5-S4)', async () => {
    const talent = await createTalent()
    const res = await call('DELETE', `/talent/${talent.reference}`)
    expect([404, 405]).toContain(res.status)
    const { status } = await call('GET', `/talent/${talent.reference}`)
    expect(status).toBe(200)
  })

  it('references of archived talent are never reused (FR-002)', async () => {
    const a = await createTalent({ name: 'Gone Soon' })
    await call('POST', `/talent/${a.reference}/archive`, { version: 1 })
    const b = await createTalent({ name: 'New Arrival' })
    expect(b.reference).not.toBe(a.reference)
  })
})
