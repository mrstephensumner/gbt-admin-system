import type { Context, Next } from 'hono'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { Env } from '../env'
import { ApiError } from './errors'

/**
 * Operator identity (FR-017, research R5).
 *
 * Production: Cloudflare Access sits in front of the hostname; we verify the
 * Access JWT (Cf-Access-Jwt-Assertion) against the team's JWKS and use its
 * email claim. Requests without a valid assertion are rejected — Access
 * should make that impossible, so a failure here means misconfiguration.
 *
 * Dev (ACCESS_TEAM_DOMAIN unset): a fake identity header or a fixed default
 * stands in, so wrangler dev and tests work without Access.
 */
export const DEV_OPERATOR = 'dev@greatbritishtalent.online'

type Variables = { operator: string }

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export async function withIdentity(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const teamDomain = c.env.ACCESS_TEAM_DOMAIN
  if (!teamDomain) {
    c.set('operator', c.req.header('Cf-Access-Authenticated-User-Email') ?? DEV_OPERATOR)
    return next()
  }

  const assertion = c.req.header('Cf-Access-Jwt-Assertion')
  if (!assertion) {
    throw new ApiError(401, 'unauthenticated', 'Sign in through Cloudflare Access to continue')
  }
  try {
    let jwks = jwksCache.get(teamDomain)
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`))
      jwksCache.set(teamDomain, jwks)
    }
    const { payload } = await jwtVerify(assertion, jwks, {
      issuer: `https://${teamDomain}`,
      audience: c.env.ACCESS_AUD,
    })
    const email = typeof payload.email === 'string' ? payload.email : null
    if (!email) throw new Error('Access token carried no email claim')
    c.set('operator', email)
  } catch {
    throw new ApiError(401, 'unauthenticated', 'Sign in through Cloudflare Access to continue')
  }
  return next()
}
