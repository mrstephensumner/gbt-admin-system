import { describe, expect, it } from 'vitest'
import { call, createTalent } from './helpers'

const COLLEAGUE = 'colleague@example.com'

describe('social profiles (spec 007 US1)', () => {
  it('adds links with attributed follower stamps; totals are exact (FR-001/002/003, SC-002)', async () => {
    const talent = await createTalent({ name: 'Reachful Speaker' })
    await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'linkedin',
      url: 'https://linkedin.com/in/reachful',
      handle: '@reachful',
      followers: 12_500,
    })
    await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'youtube',
      url: 'https://youtube.com/@reachful',
      followers: 250_000,
    })
    await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'website',
      url: 'https://reachful.example.com',
    })

    const { body } = await call('GET', `/talent/${talent.reference}/social`)
    const links = body.links as {
      platform: string
      followers: number | null
      followers_set_at: string | null
      followers_set_by: string | null
    }[]
    expect(links).toHaveLength(3)
    expect(body.total_followers).toBe(262_500)
    const linkedin = links.find((l) => l.platform === 'linkedin')!
    expect(linkedin.followers_set_by).toBe('test@greatbritishtalent.online')
    expect(linkedin.followers_set_at).toBeTruthy()
    const site = links.find((l) => l.platform === 'website')!
    expect(site.followers).toBeNull()
    expect(site.followers_set_at).toBeNull()
  })

  it('updating a count restamps as-of and updater (FR-002, SC-001)', async () => {
    await call('POST', '/team/operators', { email: COLLEAGUE })
    const talent = await createTalent()
    const created = await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'instagram',
      url: 'https://instagram.com/someone',
      followers: 1000,
    })
    const id = (created.body as { id: number }).id
    const updated = await call('PATCH', `/social/links/${id}`, { followers: 2000 }, COLLEAGUE)
    expect((updated.body as { followers: number }).followers).toBe(2000)
    expect((updated.body as { followers_set_by: string }).followers_set_by).toBe(COLLEAGUE)
  })

  it('refuses non-https links and negative counts factually (FR-001)', async () => {
    const talent = await createTalent()
    const bad = await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'x',
      url: 'http://x.com/someone',
    })
    expect(bad.status).toBe(400)
    expect((bad.body.error as { message: string }).message).toBe('Links must start with https://')
    const negative = await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'x',
      url: 'https://x.com/someone',
      followers: -5,
    })
    expect(negative.status).toBe(400)
  })

  it('link add/remove land in history; follower updates do not (FR-005)', async () => {
    const talent = await createTalent()
    const created = await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'tiktok',
      url: 'https://tiktok.com/@someone',
    })
    const id = (created.body as { id: number }).id
    await call('PATCH', `/social/links/${id}`, { followers: 500 })
    await call('DELETE', `/social/links/${id}`)

    const history = await call('GET', `/talent/${talent.reference}/history`)
    const actions = (history.body.items as { action: string }[]).map((h) => h.action)
    expect(actions).toContain('social_link_added')
    expect(actions).toContain('social_link_removed')
    expect(actions.filter((a) => a.startsWith('social_link'))).toHaveLength(2)
  })
})

describe('press mentions (spec 007 US2)', () => {
  it('lists newest-first by publication date, not entry order (FR-004, SC-004)', async () => {
    const talent = await createTalent()
    await call('POST', `/talent/${talent.reference}/social/mentions`, {
      title: 'Older piece',
      outlet: 'The Guardian',
      url: 'https://theguardian.com/older',
      published_on: '2026-05-01',
    })
    await call('POST', `/talent/${talent.reference}/social/mentions`, {
      title: 'Newest piece',
      outlet: 'BBC News',
      url: 'https://bbc.co.uk/newest',
      published_on: '2026-07-10',
    })
    await call('POST', `/talent/${talent.reference}/social/mentions`, {
      title: 'Middle piece',
      outlet: 'The Times',
      url: 'https://thetimes.com/middle',
      published_on: '2026-06-15',
    })
    const { body } = await call('GET', `/talent/${talent.reference}/social`)
    const titles = (body.mentions as { title: string }[]).map((m) => m.title)
    expect(titles).toEqual(['Newest piece', 'Middle piece', 'Older piece'])
  })

  it('mention add/remove are attributed in history; validation is factual', async () => {
    const talent = await createTalent()
    const created = await call('POST', `/talent/${talent.reference}/social/mentions`, {
      title: 'A headline',
      outlet: 'Outlet',
      url: 'https://outlet.example.com/a',
      published_on: '2026-07-01',
    })
    await call('DELETE', `/social/mentions/${(created.body as { id: number }).id}`)
    const history = await call('GET', `/talent/${talent.reference}/history`)
    const actions = (history.body.items as { action: string }[]).map((h) => h.action)
    expect(actions).toContain('press_mention_added')
    expect(actions).toContain('press_mention_removed')

    const noTitle = await call('POST', `/talent/${talent.reference}/social/mentions`, {
      title: '',
      outlet: 'Outlet',
      url: 'https://outlet.example.com/b',
      published_on: '2026-07-01',
    })
    expect(noTitle.status).toBe(400)
    expect((noTitle.body.error as { message: string }).message).toBe('Add a headline')
  })

  it('archived speakers still accept social data (edge case)', async () => {
    const talent = await createTalent({ name: 'Archived Social' })
    await call('POST', `/talent/${talent.reference}/archive`, { version: 1 })
    const { status } = await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'linkedin',
      url: 'https://linkedin.com/in/archived',
    })
    expect(status).toBe(201)
  })
})
