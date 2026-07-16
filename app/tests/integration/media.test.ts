import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'
import { call, createTalent, OPERATOR } from './helpers'

async function uploadPhoto(reference: string, category?: string) {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3])], 'p.jpg', { type: 'image/jpeg' }))
  if (category) form.set('category', category)
  const res = await SELF.fetch(`http://admin.local/api/talent/${reference}/photos`, {
    method: 'POST',
    headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    body: form,
  })
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

describe('categorised photos & avatar (spec 008 US1, SC-001)', () => {
  it('the avatar is always a headshot, never an event photo', async () => {
    const talent = await createTalent({ name: 'Avatar Subject' })
    // Event photo first — must NOT become the avatar
    const event = await uploadPhoto(talent.reference, 'event')
    expect(event.body.is_primary).toBe(false)
    // Headshot next — becomes the avatar
    const head = await uploadPhoto(talent.reference, 'headshot')
    expect(head.body.is_primary).toBe(true)

    const record = await call('GET', `/talent/${talent.reference}`)
    const photos = record.body.photos as { id: string; is_primary: boolean; category: string }[]
    const primary = photos.find((p) => p.is_primary)!
    expect(primary.category).toBe('headshot')
    expect(photos.filter((p) => p.category === 'event').every((p) => !p.is_primary)).toBe(true)

    // Directory avatar (primaryPhotoUrl) points at the headshot
    const dir = await call('GET', `/talent?q=${encodeURIComponent('Avatar Subject')}`)
    expect((dir.body.items as { primaryPhotoUrl: string | null }[])[0]!.primaryPhotoUrl).toContain(primary.id)
  })

  it('defaults to headshot when no category is given (back-compat)', async () => {
    const talent = await createTalent()
    const p = await uploadPhoto(talent.reference)
    expect(p.status).toBe(201)
    const record = await call('GET', `/talent/${talent.reference}`)
    expect((record.body.photos as { category: string }[])[0]!.category).toBe('headshot')
  })
})

describe('showreels (US1 FR-003/004)', () => {
  it('adds links deriving provider + thumbnail; remove is attributed in history', async () => {
    const talent = await createTalent()
    const yt = await call('POST', `/talent/${talent.reference}/showreels`, {
      title: 'Keynote reel',
      url: 'https://youtu.be/abc123',
    })
    expect(yt.status).toBe(201)
    expect((yt.body as { provider: string }).provider).toBe('youtube')
    expect((yt.body as { thumbnail: string }).thumbnail).toContain('img.youtube.com/vi/abc123')

    const media = await call('GET', `/talent/${talent.reference}/media`)
    expect((media.body.showreels as unknown[]).length).toBe(1)

    await call('DELETE', `/showreels/${(yt.body as { id: number }).id}`)
    const after = await call('GET', `/talent/${talent.reference}/media`)
    expect((after.body.showreels as unknown[]).length).toBe(0)

    const history = await call('GET', `/talent/${talent.reference}/history`)
    const actions = (history.body.items as { action: string }[]).map((h) => h.action)
    expect(actions).toContain('showreel_added')
    expect(actions).toContain('showreel_removed')
  })

  it('refuses non-https showreel links factually', async () => {
    const talent = await createTalent()
    const bad = await call('POST', `/talent/${talent.reference}/showreels`, { url: 'http://youtu.be/x' })
    expect(bad.status).toBe(400)
    expect((bad.body.error as { message: string }).message).toBe('Showreel links must start with https://')
  })
})

describe('SEO metadata (US2 FR-005)', () => {
  it('upserts SEO fields with attribution; a second save updates in place', async () => {
    const talent = await createTalent({ name: 'SEO Subject' })
    const first = await call('PUT', `/talent/${talent.reference}/seo`, {
      meta_title: 'Aaron Calvert | Corporate Entertainment Speaker',
      meta_description: 'Book Aaron for mind-reading keynotes.',
      focus_keyword: 'corporate entertainment speaker',
    })
    expect(first.status).toBe(200)
    expect((first.body as { updated_by: string }).updated_by).toBe(OPERATOR)

    await call('PUT', `/talent/${talent.reference}/seo`, {
      meta_title: 'Updated title',
      meta_description: null,
      focus_keyword: 'mentalist',
    })
    const media = await call('GET', `/talent/${talent.reference}/media`)
    const seo = media.body.seo as { meta_title: string; focus_keyword: string; meta_description: string | null }
    expect(seo.meta_title).toBe('Updated title')
    expect(seo.focus_keyword).toBe('mentalist')
    expect(seo.meta_description).toBeNull()

    const history = await call('GET', `/talent/${talent.reference}/history`)
    expect((history.body.items as { action: string }[]).filter((h) => h.action === 'seo_updated')).toHaveLength(2)
  })

  it('media data is available on archived speakers (edge case)', async () => {
    const talent = await createTalent({ name: 'Archived Media' })
    await call('POST', `/talent/${talent.reference}/archive`, { version: 1 })
    const reel = await call('POST', `/talent/${talent.reference}/showreels`, { url: 'https://vimeo.com/1' })
    expect(reel.status).toBe(201)
    const seo = await call('PUT', `/talent/${talent.reference}/seo`, { meta_title: 'Still editable' })
    expect(seo.status).toBe(200)
  })
})
