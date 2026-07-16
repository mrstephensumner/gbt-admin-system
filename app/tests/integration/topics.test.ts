import { describe, expect, it } from 'vitest'
import { call, createTalent, history } from './helpers'

describe('topic management (FR-018)', () => {
  it('lists topics with talent counts', async () => {
    await createTalent({ name: 'A', topics: ['AI'] })
    await createTalent({ name: 'B', topics: ['AI', 'Sport'] })
    const { body } = await call('GET', '/topics')
    const items = body.items as { name: string; talent_count: number }[]
    expect(items.find((t) => t.name === 'AI')!.talent_count).toBe(2)
    expect(items.find((t) => t.name === 'Sport')!.talent_count).toBe(1)
  })

  it('creates idempotently on a case-insensitive match', async () => {
    const first = await call('POST', '/topics', { name: 'Sustainability' })
    const second = await call('POST', '/topics', { name: 'SUSTAINABILITY' })
    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect((second.body as { id: number }).id).toBe((first.body as { id: number }).id)
  })

  it('renames a topic, refusing collisions with a merge hint', async () => {
    const a = await call('POST', '/topics', { name: 'Tech' })
    await call('POST', '/topics', { name: 'Technology' })
    const renamed = await call('POST', `/topics/${(a.body as { id: number }).id}/rename`, { name: 'Deep tech' })
    expect(renamed.status).toBe(200)
    const collision = await call('POST', `/topics/${(a.body as { id: number }).id}/rename`, { name: 'technology' })
    expect(collision.status).toBe(409)
    expect((collision.body.error as { message: string }).message).toContain('merge')
  })

  it('merges topics: links rewritten, duplicates dropped, source deleted, changes recorded', async () => {
    const a = await createTalent({ name: 'A', topics: ['AI'] })
    const b = await createTalent({ name: 'B', topics: ['Artificial Intelligence'] })
    const c = await createTalent({ name: 'C', topics: ['AI', 'Artificial Intelligence'] })

    const topics = await call('GET', '/topics')
    const items = topics.body.items as { id: number; name: string }[]
    const source = items.find((t) => t.name === 'Artificial Intelligence')!
    const target = items.find((t) => t.name === 'AI')!

    const merged = await call('POST', `/topics/${source.id}/merge`, { into: target.id })
    expect(merged.status).toBe(200)
    expect((merged.body as { talent_count: number }).talent_count).toBe(3)

    const after = await call('GET', '/topics')
    expect((after.body.items as { name: string }[]).some((t) => t.name === 'Artificial Intelligence')).toBe(false)

    for (const ref of [a.reference, b.reference, c.reference]) {
      const { body } = await call('GET', `/talent/${ref}`)
      const names = (body.topics as { name: string }[]).map((t) => t.name)
      expect(names).toContain('AI')
      expect(names).not.toContain('Artificial Intelligence')
    }
    const hB = await history(b.reference)
    expect(hB.some((e) => e.action === 'topic_merged')).toBe(true)
  })

  it('refuses to merge a topic into itself', async () => {
    const a = await call('POST', '/topics', { name: 'Solo' })
    const { status } = await call('POST', `/topics/${(a.body as { id: number }).id}/merge`, {
      into: (a.body as { id: number }).id,
    })
    expect(status).toBe(400)
  })
})
