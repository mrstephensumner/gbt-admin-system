import { beforeEach, describe, expect, it } from 'vitest'
import { call, createTalent, seedBrand, uploadPhoto } from './helpers'

async function seedRoster() {
  await seedBrand()
  // Complete + published
  const published = await createTalent({ name: 'Published Pete' })
  await uploadPhoto(published.reference)
  await call('POST', `/talent/${published.reference}/publish`, { brand: 'great-british-speakers', version: 1 })
  // Complete but unpublished → ready to publish
  const ready = await createTalent({ name: 'Ready Rita' })
  await uploadPhoto(ready.reference)
  // Missing day rate + photo → blocked
  await createTalent({ name: 'Blocked Bella', day_rate_pence: null })
  // On hold
  const held = await createTalent({ name: 'Held Harry' })
  await call('POST', `/talent/${held.reference}/status`, { status: 'on_hold', version: 1 })
  // Archived — must count nowhere
  const archived = await createTalent({ name: 'Archived Andy' })
  await call('POST', `/talent/${archived.reference}/archive`, { version: 1 })
  return { published, ready }
}

describe('dashboard (spec 004)', () => {
  beforeEach(seedRoster)

  it('KPIs equal the directory-filter totals (FR-002, SC-001)', async () => {
    const { body } = await call('GET', '/dashboard')
    const counts = body.counts as {
      active: number
      by_status: Record<string, number>
      published: { brand: string; count: number }[]
      topics: number
    }
    const directory = await call('GET', '/talent?per_page=1')
    expect(counts.active).toBe(directory.body.total)

    for (const [status, n] of Object.entries(counts.by_status)) {
      const filtered = await call('GET', `/talent?status=${status}&per_page=1`)
      expect(n).toBe(filtered.body.total)
    }
    expect(counts.by_status.on_hold).toBe(1)
    expect(counts.published.find((p) => p.brand === 'great-british-speakers')!.count).toBe(1)
    expect(counts.topics).toBeGreaterThan(0)
  })

  it('brands with zero published speakers still appear (edge case)', async () => {
    await seedBrand('great-british-presenters', 'Great British Presenters')
    const { body } = await call('GET', '/dashboard')
    const presenters = (body.counts as { published: { brand: string; count: number }[] }).published.find(
      (p) => p.brand === 'great-british-presenters',
    )
    expect(presenters).toBeDefined()
    expect(presenters!.count).toBe(0)
  })

  it('attention lists are correct: membership, missing labels, archived excluded (FR-004, SC-003)', async () => {
    const { body } = await call('GET', '/dashboard')
    const attention = body.attention as {
      ready_to_publish: { items: { name: string }[]; total: number }
      blocked: { items: { name: string; missing: string[] }[]; total: number }
    }
    expect(attention.ready_to_publish.items.map((i) => i.name)).toContain('Ready Rita')
    expect(attention.ready_to_publish.items.map((i) => i.name)).not.toContain('Published Pete')

    const bella = attention.blocked.items.find((i) => i.name === 'Blocked Bella')!
    expect(bella.missing.sort()).toEqual(['day_rate', 'photo'])
    // Held Harry lacks a photo → blocked too; Archived Andy appears nowhere
    expect(attention.blocked.items.map((i) => i.name)).toContain('Held Harry')
    const everyone = [
      ...attention.ready_to_publish.items.map((i) => i.name),
      ...attention.blocked.items.map((i) => i.name),
    ]
    expect(everyone).not.toContain('Archived Andy')
  })

  it('publishing removes a record from ready-to-publish (US2-S1)', async () => {
    const before = await call('GET', '/dashboard')
    const rita = (before.body.attention as { ready_to_publish: { items: { reference: string; name: string }[] } })
      .ready_to_publish.items.find((i) => i.name === 'Ready Rita')!
    const record = await call('GET', `/talent/${rita.reference}`)
    await call('POST', `/talent/${rita.reference}/publish`, {
      brand: 'great-british-speakers',
      version: record.body.version,
    })
    const after = await call('GET', '/dashboard')
    expect(
      (after.body.attention as { ready_to_publish: { items: { name: string }[] } }).ready_to_publish.items.map(
        (i) => i.name,
      ),
    ).not.toContain('Ready Rita')
  })

  it('activity feed is newest-first, attributed, and linked by reference (FR-005)', async () => {
    const { body } = await call('GET', '/dashboard')
    const activity = body.activity as { reference: string; name: string; actor: string; action: string; at: string }[]
    expect(activity.length).toBeGreaterThan(0)
    expect(activity[0]!.action).toBe('archived') // last seeded action
    expect(activity[0]!.name).toBe('Archived Andy')
    expect(activity[0]!.actor).toBe('test@greatbritishtalent.online')
    expect(activity.every((a) => a.reference.startsWith('TAL-'))).toBe(true)
  })

  it('is readable at baseline permission — no grants needed (FR-006)', async () => {
    await call('POST', '/team/operators', { email: 'plain@example.com' })
    const { status } = await call('GET', '/dashboard', undefined, 'plain@example.com')
    expect(status).toBe(200)
  })
})
