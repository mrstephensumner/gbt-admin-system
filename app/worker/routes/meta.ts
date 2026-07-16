import { Hono } from 'hono'
import type { Env } from '../env'
import type { AuthzVariables } from '../middleware/authorize'

export const meta = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

/** The registered operator view: email, role, grants (contracts/api.md spec 002). */
meta.get('/me', (c) => {
  const record = c.get('operatorRecord')
  return c.json({ email: record.email, role: record.role, grants: record.grants })
})
