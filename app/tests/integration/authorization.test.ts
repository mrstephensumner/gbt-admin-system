import { describe, expect, it } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../../worker/index'
import { call, createTalent, seedBrand, uploadPhoto, OPERATOR } from './helpers'

/**
 * Spec 002 US1 + US3: the registry gate and the full permission matrix.
 * OPERATOR (test@…) is the bootstrapped owner via the OWNER_EMAIL binding.
 */
const STRANGER = 'stranger@example.com'
const COLLEAGUE = 'colleague@example.com'

async function addColleague(grants: string[] = []) {
  const { body } = await call('POST', '/team/operators', { email: COLLEAGUE })
  const id = (body as { id: number }).id
  if (grants.length) await call('PUT', `/team/operators/${id}/grants`, { grants })
  return id
}

describe('registry gate (US1, FR-003)', () => {
  it.each([
    ['GET', '/talent'],
    ['GET', '/topics'],
    ['GET', '/brands'],
    ['GET', '/me'],
    ['POST', '/talent'],
  ])('refuses unregistered identities on %s %s, reads included', async (method, path) => {
    const { status, body } = await call(method, path, method === 'POST' ? { name: 'X', topics: ['T'] } : undefined, STRANGER)
    expect(status).toBe(403)
    expect((body.error as { code: string }).code).toBe('not_registered')
    expect((body.error as { message: string }).message).toBe("You don't have access yet — ask the owner to add you")
  })

  it('bootstraps the configured owner exactly once, audited (research R4)', async () => {
    await call('GET', '/me') // any request triggers bootstrap
    await call('GET', '/me')
    const { body } = await call('GET', '/team/operators')
    const owners = (body.items as { role: string; email: string }[]).filter((o) => o.role === 'owner')
    expect(owners).toHaveLength(1)
    expect(owners[0]!.email).toBe(OPERATOR)
    const audit = await call('GET', '/team/audit')
    const bootstraps = (audit.body.items as { action: string }[]).filter((a) => a.action === 'owner_bootstrapped')
    expect(bootstraps).toHaveLength(1)
  })

  it('matches operator identity case-insensitively (FR-001)', async () => {
    const { status, body } = await call('GET', '/me', undefined, 'TEST@GreatBritishTalent.online')
    expect(status).toBe(200)
    expect((body as { role: string }).role).toBe('owner')
  })

  it('fails loudly when the registry is empty and OWNER_EMAIL is unset', async () => {
    const res = await app.fetch(
      new Request('http://admin.local/api/me', {
        headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
      }),
      { ...env, OWNER_EMAIL: '' },
    )
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('owner_unconfigured')
  })
})

describe('permission matrix (US3, FR-006/007, SC-001)', () => {
  it('registered operator baseline: view, create, edit ordinary fields, photos — no grants needed', async () => {
    await addColleague()
    const dir = await call('GET', '/talent', undefined, COLLEAGUE)
    expect(dir.status).toBe(200)
    const created = await call(
      'POST',
      '/talent',
      { name: 'Made By Colleague', topics: ['Testing'] },
      COLLEAGUE,
    )
    expect(created.status).toBe(201)
    const patched = await call(
      'PATCH',
      `/talent/${created.body.reference}`,
      { version: 1, headline: 'Edited by colleague' },
      COLLEAGUE,
    )
    expect(patched.status).toBe(200)
  })

  it('edit_day_rates: field-level — day-rate change refused whole, other fields unaffected (R5)', async () => {
    await addColleague()
    const talent = await createTalent({ day_rate_pence: 400_000 })
    const denied = await call(
      'PATCH',
      `/talent/${talent.reference}`,
      { version: 1, day_rate_pence: 999_900, headline: 'Should not apply' },
      COLLEAGUE,
    )
    expect(denied.status).toBe(403)
    expect((denied.body.error as { message: string }).message).toBe(
      "You don't have permission to edit day rates — ask the owner",
    )
    const fresh = await call('GET', `/talent/${talent.reference}`)
    expect(fresh.body.day_rate_pence).toBe(400_000)
    expect(fresh.body.headline).not.toBe('Should not apply')

    // Same payload without touching the rate is allowed (sends unchanged value)
    const ok = await call(
      'PATCH',
      `/talent/${talent.reference}`,
      { version: 1, day_rate_pence: 400_000, headline: 'Rate untouched' },
      COLLEAGUE,
    )
    expect(ok.status).toBe(200)
  })

  it.each([
    ['publish', 'publish'],
    ['unpublish', 'publish'],
    ['archive', 'archive'],
    ['restore', 'archive'],
  ])('%s requires the %s grant and works once granted', async (action, grant) => {
    await seedBrand()
    const id = await addColleague()
    const talent = await createTalent()
    await uploadPhoto(talent.reference)

    const payload = action === 'publish' || action === 'unpublish'
      ? { brand: 'great-british-speakers', version: 1 }
      : { version: 1 }
    const denied = await call('POST', `/talent/${talent.reference}/${action}`, payload, COLLEAGUE)
    expect(denied.status).toBe(403)
    expect((denied.body as { permission: string }).permission).toBe(grant)

    await call('PUT', `/team/operators/${id}/grants`, { grants: [grant] })
    const allowed = await call('POST', `/talent/${talent.reference}/${action}`, payload, COLLEAGUE)
    expect([200, 422]).toContain(allowed.status) // 422 = domain gating (e.g. unpublish when not published) — authz passed
    expect(allowed.status === 200 || (allowed.body.error as { code: string }).code !== 'forbidden').toBe(true)
  })

  it('manage_topics gates rename and merge', async () => {
    const id = await addColleague()
    const a = await call('POST', '/topics', { name: 'Tech' })
    const denied = await call('POST', `/topics/${(a.body as { id: number }).id}/rename`, { name: 'Deep tech' }, COLLEAGUE)
    expect(denied.status).toBe(403)
    await call('PUT', `/team/operators/${id}/grants`, { grants: ['manage_topics'] })
    const allowed = await call('POST', `/topics/${(a.body as { id: number }).id}/rename`, { name: 'Deep tech' }, COLLEAGUE)
    expect(allowed.status).toBe(200)
  })

  it('revocation applies on the very next request (SC-003, research R6)', async () => {
    await seedBrand()
    const id = await addColleague(['publish'])
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const first = await call('POST', `/talent/${talent.reference}/publish`, { brand: 'great-british-speakers', version: 1 }, COLLEAGUE)
    expect(first.status).toBe(200)

    await call('PUT', `/team/operators/${id}/grants`, { grants: [] })
    const second = await call(
      'POST',
      `/talent/${talent.reference}/unpublish`,
      { brand: 'great-british-speakers', version: first.body.version },
      COLLEAGUE,
    )
    expect(second.status).toBe(403)
  })

  it('owner bypasses every check (FR-002)', async () => {
    await seedBrand()
    const talent = await createTalent()
    await uploadPhoto(talent.reference)
    const pub = await call('POST', `/talent/${talent.reference}/publish`, { brand: 'great-british-speakers', version: 1 })
    expect(pub.status).toBe(200)
    const rate = await call('PATCH', `/talent/${talent.reference}`, { version: pub.body.version, day_rate_pence: 123_400 })
    expect(rate.status).toBe(200)
  })

  it('team management is owner-only, not grantable (FR-002)', async () => {
    await addColleague(['publish', 'archive', 'edit_day_rates', 'manage_topics'])
    const { status } = await call('GET', '/team/operators', undefined, COLLEAGUE)
    expect(status).toBe(403)
    const add = await call('POST', '/team/operators', { email: 'friend@example.com' }, COLLEAGUE)
    expect(add.status).toBe(403)
  })
})
