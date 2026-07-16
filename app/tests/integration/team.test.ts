import { describe, expect, it } from 'vitest'
import { call, createTalent } from './helpers'

const COLLEAGUE = 'colleague@example.com'

describe('team management (US2, FR-004/005/009/010/011)', () => {
  it('adds an operator with no grants; idempotent on case-insensitive re-add', async () => {
    const first = await call('POST', '/team/operators', { email: COLLEAGUE })
    expect(first.status).toBe(201)
    expect((first.body as { grants: string[] }).grants).toEqual([])
    const second = await call('POST', '/team/operators', { email: 'COLLEAGUE@Example.com' })
    expect(second.status).toBe(200)
    expect((second.body as { id: number }).id).toBe((first.body as { id: number }).id)
    const list = await call('GET', '/team/operators')
    expect((list.body.items as unknown[]).length).toBe(2) // owner + colleague
  })

  it('rejects an invalid email with a factual message', async () => {
    const { status, body } = await call('POST', '/team/operators', { email: 'not-an-email' })
    expect(status).toBe(400)
    expect((body.error as { message: string }).message).toBe('Enter a valid email address')
  })

  it('removes an operator: next request refused, history attribution survives (FR-009)', async () => {
    const added = await call('POST', '/team/operators', { email: COLLEAGUE })
    const talent = await createTalent({ name: 'Attributed Work' })
    await call('PATCH', `/talent/${talent.reference}`, { version: 1, headline: 'By colleague' }, COLLEAGUE)

    await call('DELETE', `/team/operators/${(added.body as { id: number }).id}`)
    const refused = await call('GET', '/talent', undefined, COLLEAGUE)
    expect(refused.status).toBe(403)

    const history = await call('GET', `/talent/${talent.reference}/history`)
    const actors = (history.body.items as { actor: string }[]).map((h) => h.actor)
    expect(actors).toContain(COLLEAGUE)
  })

  it('owner cannot be removed or grant-edited (FR-005, SC-005)', async () => {
    const list = await call('GET', '/team/operators')
    const owner = (list.body.items as { id: number; role: string }[]).find((o) => o.role === 'owner')!
    const removal = await call('DELETE', `/team/operators/${owner.id}`)
    expect(removal.status).toBe(422)
    expect((removal.body.error as { code: string }).code).toBe('owner_invariant')
    const grants = await call('PUT', `/team/operators/${owner.id}/grants`, { grants: [] })
    expect(grants.status).toBe(422)
  })

  it('grant replace is a diff: each change audited individually (FR-010, SC-006)', async () => {
    const added = await call('POST', '/team/operators', { email: COLLEAGUE })
    const id = (added.body as { id: number }).id
    await call('PUT', `/team/operators/${id}/grants`, { grants: ['publish', 'archive'] })
    await call('PUT', `/team/operators/${id}/grants`, { grants: ['archive', 'manage_topics'] })

    const audit = await call('GET', '/team/audit')
    const events = (audit.body.items as { action: string; detail: string | null; subject_email: string }[]).filter(
      (a) => a.subject_email === COLLEAGUE,
    )
    const granted = events.filter((e) => e.action === 'permission_granted').map((e) => e.detail)
    const revoked = events.filter((e) => e.action === 'permission_revoked').map((e) => e.detail)
    expect(granted.sort()).toEqual(['archive', 'manage_topics', 'publish'])
    expect(revoked).toEqual(['publish'])
    expect(events.some((e) => e.action === 'operator_added')).toBe(true)
  })

  it('rejects unknown permission areas', async () => {
    const added = await call('POST', '/team/operators', { email: COLLEAGUE })
    const { status, body } = await call('PUT', `/team/operators/${(added.body as { id: number }).id}/grants`, {
      grants: ['superpowers'],
    })
    expect(status).toBe(400)
    expect((body.error as { message: string }).message).toBe('Unknown permission area')
  })
})
