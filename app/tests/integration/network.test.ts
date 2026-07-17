import { describe, expect, it } from 'vitest'
import { call, createTalent, seedBrand, uploadPhoto } from './helpers'

const COLLEAGUE = 'colleague@example.com'

describe('network site management (spec 009 US1)', () => {
  it('adds sites with unique slugs and lists them with published counts', async () => {
    await seedBrand() // great-british-speakers
    const p = await call('POST', '/network', { name: 'Great British Presenters', slug: 'great-british-presenters', url: 'https://greatbritishpresenters.co.uk' })
    expect(p.status).toBe(201)
    const dupe = await call('POST', '/network', { name: 'Dup', slug: 'great-british-presenters' })
    expect(dupe.status).toBe(409)
    expect((dupe.body.error as { message: string }).message).toContain('already exists')

    const { body } = await call('GET', '/network')
    const slugs = (body.items as { slug: string; active: boolean }[]).map((s) => s.slug)
    expect(slugs).toContain('great-british-speakers')
    expect(slugs).toContain('great-british-presenters')
  })

  it('rejects malformed slugs factually', async () => {
    const bad = await call('POST', '/network', { name: 'Bad', slug: 'Not A Slug!' })
    expect(bad.status).toBe(400)
    expect((bad.body.error as { message: string }).message).toContain('lowercase')
  })

  it('edits a site name/url and toggles active', async () => {
    const created = await call('POST', '/network', { name: 'Voices', slug: 'great-british-voices' })
    const id = (created.body as { id: number }).id
    await call('PATCH', `/network/${id}`, { name: 'Great British Voices', url: 'https://greatbritishvoices.co.uk', active: false })
    const { body } = await call('GET', '/network')
    const voices = (body.items as { id: number; name: string; url: string; active: boolean }[]).find((s) => s.id === id)!
    expect(voices.name).toBe('Great British Voices')
    expect(voices.url).toBe('https://greatbritishvoices.co.uk')
    expect(voices.active).toBe(false)
  })

  it('only holders of the network permission may manage sites (SC-003)', async () => {
    await call('POST', '/team/operators', { email: COLLEAGUE })
    const denied = await call('POST', '/network', { name: 'X', slug: 'x-site' }, COLLEAGUE)
    expect(denied.status).toBe(403)
    expect((denied.body.error as { message: string }).message).toBe("You don't have permission to manage the network — ask the owner")
    // reading the network is baseline
    const read = await call('GET', '/network', undefined, COLLEAGUE)
    expect(read.status).toBe(200)
  })
})

describe('publishing across network sites (US2, SC-002)', () => {
  it('a talent lists all active sites and publishes independently per site', async () => {
    await seedBrand()
    await call('POST', '/network', { name: 'Great British Presenters', slug: 'great-british-presenters' })
    const talent = await createTalent()
    await uploadPhoto(talent.reference)

    const record = await call('GET', `/talent/${talent.reference}`)
    const pubs = record.body.publications as { brand: string; published: boolean }[]
    expect(pubs.map((p) => p.brand).sort()).toEqual(['great-british-presenters', 'great-british-speakers'])

    // Publish to speakers only
    const published = await call('POST', `/talent/${talent.reference}/publish`, { brand: 'great-british-speakers', version: 1 })
    const after = published.body.publications as { brand: string; published: boolean }[]
    expect(after.find((p) => p.brand === 'great-british-speakers')!.published).toBe(true)
    expect(after.find((p) => p.brand === 'great-british-presenters')!.published).toBe(false)
  })

  it('deactivating a site preserves existing publications but drops it from unpublished choices (SC-002)', async () => {
    await seedBrand()
    const created = await call('POST', '/network', { name: 'Presenters', slug: 'great-british-presenters' })
    const siteId = (created.body as { id: number }).id
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const pub = await call('POST', `/talent/${talent.reference}/publish`, { brand: 'great-british-presenters', version: 1 })

    // Deactivate the site
    await call('PATCH', `/network/${siteId}`, { active: false })

    // Still shown on the talent (published) so it can be unpublished
    const record = await call('GET', `/talent/${talent.reference}`)
    const pubs = record.body.publications as { brand: string; published: boolean }[]
    const presenters = pubs.find((p) => p.brand === 'great-british-presenters')
    expect(presenters).toBeDefined()
    expect(presenters!.published).toBe(true)

    // But a fresh talent (not published there) does NOT see the inactive site
    const fresh = await createTalent({ name: 'Fresh One' })
    const freshPubs = (await call('GET', `/talent/${fresh.reference}`)).body.publications as { brand: string }[]
    expect(freshPubs.map((p) => p.brand)).not.toContain('great-british-presenters')
    void pub
  })
})
