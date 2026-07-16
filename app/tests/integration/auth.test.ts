import { describe, expect, it } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../../worker/index'

/**
 * FR-017 / research R5: the production Cloudflare Access branch. These tests
 * invoke the app with an env override so the JWT-verification path runs
 * without real Access in front. A structurally invalid assertion fails in
 * jose before any JWKS network fetch, keeping the tests hermetic.
 */
const accessEnv = { ...env, ACCESS_TEAM_DOMAIN: 'gbt.cloudflareaccess.com', ACCESS_AUD: 'test-aud-tag' }

function fetchWith(envOverride: typeof env, headers: Record<string, string> = {}) {
  return app.fetch(new Request('http://admin.local/api/me', { headers }), envOverride)
}

describe('operator identity (FR-017)', () => {
  it('rejects requests without an Access assertion when Access is configured', async () => {
    const res = await fetchWith(accessEnv)
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('unauthenticated')
    expect(body.error.message).toBe('Sign in through Cloudflare Access to continue')
  })

  it('rejects a forged/garbage Access assertion', async () => {
    const res = await fetchWith(accessEnv, { 'Cf-Access-Jwt-Assertion': 'not-a-real-jwt' })
    expect(res.status).toBe(401)
  })

  it('ignores the dev identity header when Access is configured (no bypass)', async () => {
    const res = await fetchWith(accessEnv, {
      'Cf-Access-Authenticated-User-Email': 'attacker@example.com',
    })
    expect(res.status).toBe(401)
  })

  it('fails loudly when Access is half-configured (domain without AUD)', async () => {
    const res = await fetchWith({ ...env, ACCESS_TEAM_DOMAIN: 'gbt.cloudflareaccess.com', ACCESS_AUD: '' })
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('access_misconfigured')
  })

  it('uses the dev header identity only when Access is not configured (registered → operator view)', async () => {
    // test@… is the bootstrapped owner (OWNER_EMAIL test binding, spec 002)
    const res = await fetchWith(env, { 'Cf-Access-Authenticated-User-Email': 'test@greatbritishtalent.online' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { email: string; role: string; grants: string[] }
    expect(body.email).toBe('test@greatbritishtalent.online')
    expect(body.role).toBe('owner')
    expect(body.grants.length).toBeGreaterThan(0)
  })

  it('dev identities that are not registered operators hit the registry gate (spec 002 FR-003)', async () => {
    const res = await fetchWith(env) // no header → dev@…, unregistered in tests
    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('not_registered')
  })
})
