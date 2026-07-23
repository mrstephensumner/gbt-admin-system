import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { publishSafeSocial } from '../../worker/services/social'
import { call, createTalent } from './helpers'

const COLLEAGUE = 'colleague@example.com'

async function talentId(reference: string): Promise<number> {
  const row = await env.DB.prepare('SELECT id FROM talent WHERE reference = ?').bind(reference).first<{ id: number }>()
  return row!.id
}

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

describe('notable posts (spec 014 US1)', () => {
  it('adds posts, lists newest-first, and attributes add/remove in history (FR-001, SC-001/005)', async () => {
    const talent = await createTalent({ name: 'Viral Speaker' })
    await call('POST', `/talent/${talent.reference}/social/posts`, {
      platform: 'tiktok',
      url: 'https://tiktok.com/@v/1',
      caption: 'Older clip',
      interactions: 1000,
      posted_on: '2026-06-01',
    })
    const newer = await call('POST', `/talent/${talent.reference}/social/posts`, {
      platform: 'instagram',
      url: 'https://instagram.com/p/2',
      caption: 'Newer clip',
      interactions: 90_000,
      posted_on: '2026-07-10',
    })
    expect(newer.status).toBe(201)

    const { body } = await call('GET', `/talent/${talent.reference}/social`)
    const posts = body.posts as { caption: string; interactions: number; posted_on: string; public: number }[]
    expect(posts.map((p) => p.caption)).toEqual(['Newer clip', 'Older clip'])
    expect(posts[0]!.public).toBe(1)

    await call('DELETE', `/social/posts/${(newer.body as { id: number }).id}`)
    const history = await call('GET', `/talent/${talent.reference}/history`)
    const actions = (history.body.items as { action: string }[]).map((h) => h.action)
    expect(actions).toContain('notable_post_added')
    expect(actions).toContain('notable_post_removed')
  })

  it('refuses non-https links and negative interactions factually (FR-001)', async () => {
    const talent = await createTalent()
    const http = await call('POST', `/talent/${talent.reference}/social/posts`, {
      platform: 'tiktok',
      url: 'http://tiktok.com/@x/1',
      interactions: 10,
      posted_on: '2026-07-01',
    })
    expect(http.status).toBe(400)
    const negative = await call('POST', `/talent/${talent.reference}/social/posts`, {
      platform: 'tiktok',
      url: 'https://tiktok.com/@x/1',
      interactions: -5,
      posted_on: '2026-07-01',
    })
    expect(negative.status).toBe(400)
    expect((negative.body.error as { message: string }).message).toBe('Interactions cannot be negative')
  })
})

describe('publish-safe boundary (spec 014 US4)', () => {
  it('toggling public is attributed and hides the item from the publish-safe read (FR-003/004, SC-003/005)', async () => {
    const talent = await createTalent({ name: 'Boundary Speaker' })
    const link = await call('POST', `/talent/${talent.reference}/social/links`, {
      platform: 'linkedin',
      url: 'https://linkedin.com/in/boundary',
      handle: '@boundary',
      followers: 5000,
    })
    const mention = await call('POST', `/talent/${talent.reference}/social/mentions`, {
      title: 'Public headline',
      outlet: 'The Paper',
      url: 'https://paper.example.com/a',
      published_on: '2026-07-05',
    })
    await call('POST', `/talent/${talent.reference}/social/posts`, {
      platform: 'tiktok',
      url: 'https://tiktok.com/@b/1',
      caption: 'Public post',
      interactions: 42_000,
      posted_on: '2026-07-08',
    })

    const id = await talentId(talent.reference)
    // All public by default.
    let safe = await publishSafeSocial(env.DB, id)
    expect(safe.profiles).toHaveLength(1)
    expect(safe.mentions).toHaveLength(1)
    expect(safe.posts).toHaveLength(1)
    // Only publish-safe fields — never internal attribution.
    const profile = safe.profiles[0] as Record<string, unknown>
    expect(Object.keys(profile).sort()).toEqual(['followers', 'handle', 'platform', 'url'])
    expect(profile).not.toHaveProperty('followers_set_by')
    expect(profile).not.toHaveProperty('created_by')
    const post = safe.posts[0] as Record<string, unknown>
    expect(Object.keys(post).sort()).toEqual(['caption', 'interactions', 'platform', 'posted_on', 'url'])
    expect(post).not.toHaveProperty('created_by')

    // Toggle the mention internal — it drops out of the publish-safe read.
    const toggled = await call('PATCH', `/social/mentions/${(mention.body as { id: number }).id}/public`, { public: false })
    expect(toggled.status).toBe(200)
    safe = await publishSafeSocial(env.DB, id)
    expect(safe.mentions).toHaveLength(0)
    expect(safe.profiles).toHaveLength(1)

    // The toggle is attributed in history.
    const history = await call('GET', `/talent/${talent.reference}/history`)
    const toggleEntry = (history.body.items as { action: string; field: string | null }[]).find((h) => h.action === 'visibility_changed')
    expect(toggleEntry?.field).toBe('mentions')

    // The talent serialization never exposes social/press/post data at all (SC-004).
    const talentGet = await call('GET', `/talent/${talent.reference}`)
    expect(JSON.stringify(talentGet.body)).not.toContain('Public headline')
    expect(talentGet.body).not.toHaveProperty('links')
    expect(talentGet.body).not.toHaveProperty('posts')
    void link
  })
})

describe('dashboard coverage feed (spec 014 US2)', () => {
  it('merges press mentions and notable posts across the roster, newest-first (FR-002, SC-002)', async () => {
    const a = await createTalent({ name: 'Coverage A' })
    const b = await createTalent({ name: 'Coverage B' })
    await call('POST', `/talent/${a.reference}/social/mentions`, {
      title: 'A in the paper',
      outlet: 'Outlet A',
      url: 'https://a.example.com/1',
      published_on: '2026-07-01',
    })
    await call('POST', `/talent/${b.reference}/social/posts`, {
      platform: 'youtube',
      url: 'https://youtube.com/watch?v=1',
      caption: 'B goes viral',
      interactions: 300_000,
      posted_on: '2026-07-15',
    })

    const { body } = await call('GET', '/dashboard')
    const coverage = body.coverage as { kind: string; name: string; on_date: string; interactions: number | null }[]
    expect(coverage).toHaveLength(2)
    const [first, second] = coverage
    // Newest-first by the item's own date: B's post (15th) before A's mention (1st).
    expect(first!.kind).toBe('post')
    expect(first!.name).toBe('Coverage B')
    expect(first!.interactions).toBe(300_000)
    expect(second!.kind).toBe('press')
    expect(second!.interactions).toBeNull()
  })
})
