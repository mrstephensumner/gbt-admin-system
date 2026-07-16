import { describe, expect, it } from 'vitest'
import { call, createTalent, history } from './helpers'

describe('status changes (US3, FR-005)', () => {
  it('walks the full fixed vocabulary, attributing every change', async () => {
    const talent = await createTalent()
    let version = 1
    for (const status of ['on_hold', 'booked', 'confirmed', 'cancelled', 'available'] as const) {
      const res = await call('POST', `/talent/${talent.reference}/status`, { status, version })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe(status)
      version = res.body.version as number
    }
    const h = await history(talent.reference)
    const statusChanges = h.filter((e) => e.action === 'status_changed')
    expect(statusChanges).toHaveLength(5)
    expect(statusChanges.every((e) => e.actor === 'test@greatbritishtalent.online')).toBe(true)
  })

  it('rejects any value outside the vocabulary (US3-S1)', async () => {
    const talent = await createTalent()
    const { status, body } = await call('POST', `/talent/${talent.reference}/status`, {
      status: 'pending',
      version: 1,
    })
    expect(status).toBe(400)
    expect((body.error as { message: string }).message).toBe('Status must be one of the fixed vocabulary')
  })

  it('409s on a stale version without applying the change', async () => {
    const talent = await createTalent()
    await call('POST', `/talent/${talent.reference}/status`, { status: 'on_hold', version: 1 })
    const { status } = await call('POST', `/talent/${talent.reference}/status`, { status: 'booked', version: 1 })
    expect(status).toBe(409)
    const { body } = await call('GET', `/talent/${talent.reference}`)
    expect(body.status).toBe('on_hold')
  })
})
