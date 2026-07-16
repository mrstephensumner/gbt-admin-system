import { describe, expect, it } from 'vitest'
import { call, createTalent, history } from './helpers'

describe('talent create (US1, FR-001/002)', () => {
  it('creates a record with a TAL-NNNN reference and created history', async () => {
    const talent = await createTalent()
    expect(talent.reference).toMatch(/^TAL-\d{4,}$/)
    expect(talent.status).toBe('available')
    expect(talent.version).toBe(1)
    const h = await history(talent.reference)
    expect(h.some((e) => e.action === 'created')).toBe(true)
  })

  it('allocates unique, incrementing references', async () => {
    const a = await createTalent({ name: 'First Person' })
    const b = await createTalent({ name: 'Second Person' })
    expect(a.reference).not.toBe(b.reference)
  })

  it('rejects a record without a name (factual sentence-case message)', async () => {
    const { status, body } = await call('POST', '/talent', { topics: ['AI'] })
    expect(status).toBe(400)
    expect((body.error as { message: string }).message).toBe('Add a name')
  })

  it('rejects a record without topics (FR-001 requires at least one)', async () => {
    const { status, body } = await call('POST', '/talent', { name: 'No Topics', topics: [] })
    expect(status).toBe(400)
    expect((body.error as { message: string }).message).toBe('Add at least one topic')
  })

  it('reuses an existing topic case-insensitively when created inline (FR-018)', async () => {
    const a = await createTalent({ name: 'A', topics: ['AI'] })
    const b = await createTalent({ name: 'B', topics: ['ai'] })
    const aTopics = a.topics as { id: number; name: string }[]
    const bTopics = b.topics as { id: number; name: string }[]
    expect(aTopics[0]!.id).toBe(bTopics[0]!.id)
    expect(bTopics[0]!.name).toBe('AI')
  })
})

describe('talent read/update (US1, FR-003/004/016)', () => {
  it('404s on an unknown reference', async () => {
    const { status } = await call('GET', '/talent/TAL-9999')
    expect(status).toBe(404)
  })

  it('updates fields, bumps version, and records attributed field changes', async () => {
    const talent = await createTalent()
    const { status, body } = await call('PATCH', `/talent/${talent.reference}`, {
      version: 1,
      day_rate_pence: 500_000,
      headline: 'Updated headline',
    })
    expect(status).toBe(200)
    expect(body.version).toBe(2)
    expect(body.day_rate_pence).toBe(500_000)

    const h = await history(talent.reference)
    const rateChange = h.find((e) => e.field === 'day_rate_pence')
    expect(rateChange).toBeDefined()
    expect(rateChange!.old_value).toBe('450000')
    expect(rateChange!.new_value).toBe('500000')
    expect(rateChange!.actor).toBe('test@greatbritishtalent.online')
  })

  it('returns 409 with the current record on a stale version (FR-016)', async () => {
    const talent = await createTalent()
    await call('PATCH', `/talent/${talent.reference}`, { version: 1, headline: 'First edit' })
    const { status, body } = await call('PATCH', `/talent/${talent.reference}`, {
      version: 1,
      headline: 'Second edit from a stale tab',
    })
    expect(status).toBe(409)
    expect((body.error as { code: string }).code).toBe('version_conflict')
    const current = body.current as { headline: string; version: number }
    expect(current.headline).toBe('First edit')
    expect(current.version).toBe(2)
    // The stale write must not have applied
    const { body: fresh } = await call('GET', `/talent/${talent.reference}`)
    expect(fresh.headline).toBe('First edit')
  })

  it('replaces the topic set and records the change', async () => {
    const talent = await createTalent({ topics: ['Leadership'] })
    const { status, body } = await call('PATCH', `/talent/${talent.reference}`, {
      version: 1,
      topics: ['AI', 'Sport'],
    })
    expect(status).toBe(200)
    const names = (body.topics as { name: string }[]).map((t) => t.name).sort()
    expect(names).toEqual(['AI', 'Sport'])
    const h = await history(talent.reference)
    expect(h.some((e) => e.field === 'topics')).toBe(true)
  })

  it('does not allow editing the reference', async () => {
    const talent = await createTalent()
    const { body } = await call('PATCH', `/talent/${talent.reference}`, {
      version: 1,
      reference: 'TAL-7777',
      name: 'Renamed Person',
    })
    expect(body.reference).toBe(talent.reference)
  })
})
