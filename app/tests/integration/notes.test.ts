import { describe, expect, it } from 'vitest'
import { call, createTalent } from './helpers'

const COLLEAGUE = 'colleague@example.com'

describe('internal talent notes (spec 006)', () => {
  it('adds attributed notes, listed newest-first (FR-001/002, SC-001)', async () => {
    await call('POST', '/team/operators', { email: COLLEAGUE })
    const talent = await createTalent({ name: 'Noted Speaker' })

    const first = await call('POST', `/talent/${talent.reference}/notes`, { body: 'Prefers morning sessions' })
    expect(first.status).toBe(201)
    await call('POST', `/talent/${talent.reference}/notes`, { body: 'Agent asked to hold fees' }, COLLEAGUE)

    const { body } = await call('GET', `/talent/${talent.reference}/notes`)
    const items = body.items as { author: string; body: string; created_at: string }[]
    expect(body.total).toBe(2)
    expect(items[0]!.body).toBe('Agent asked to hold fees')
    expect(items[0]!.author).toBe(COLLEAGUE)
    expect(items[1]!.author).toBe('test@greatbritishtalent.online')
    expect(items[0]!.created_at >= items[1]!.created_at).toBe(true)
  })

  it('refuses empty and oversized notes with factual messages (FR-001)', async () => {
    const talent = await createTalent()
    const empty = await call('POST', `/talent/${talent.reference}/notes`, { body: '   ' })
    expect(empty.status).toBe(400)
    expect((empty.body.error as { message: string }).message).toBe('Write a note before saving')
    const long = await call('POST', `/talent/${talent.reference}/notes`, { body: 'x'.repeat(4001) })
    expect(long.status).toBe(400)
  })

  it('note events land in history and activity statistics (FR-004)', async () => {
    const talent = await createTalent()
    await call('POST', `/talent/${talent.reference}/notes`, { body: 'A note' })
    const history = await call('GET', `/talent/${talent.reference}/history`)
    expect((history.body.items as { action: string }[]).some((h) => h.action === 'note_added')).toBe(true)
    const stats = await call('GET', `/talent/${talent.reference}/stats`)
    expect((stats.body.activity as { by_action: Record<string, number> }).by_action.note_added).toBe(1)
  })

  it('archived records still accept notes (FR-001)', async () => {
    const talent = await createTalent({ name: 'Archived Notee' })
    await call('POST', `/talent/${talent.reference}/archive`, { version: 1 })
    const { status } = await call('POST', `/talent/${talent.reference}/notes`, { body: 'Still noteworthy' })
    expect(status).toBe(201)
  })

  it('unknown reference 404s; notes list paginates', async () => {
    expect((await call('GET', '/talent/TAL-9999/notes')).status).toBe(404)
    const talent = await createTalent()
    for (let i = 1; i <= 3; i++) await call('POST', `/talent/${talent.reference}/notes`, { body: `Note ${i}` })
    const page = await call('GET', `/talent/${talent.reference}/notes?per_page=2&page=2`)
    expect((page.body.items as unknown[]).length).toBe(1)
    expect(page.body.total).toBe(3)
  })
})
