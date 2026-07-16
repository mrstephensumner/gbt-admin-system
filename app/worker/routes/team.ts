import { Hono } from 'hono'
import { z } from 'zod'
import { PERMISSIONS } from '../../shared/permissions'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { requireOwner, type AuthzVariables } from '../middleware/authorize'
import { addOperator, listAudit, listOperators, removeOperator, replaceGrants } from '../services/operators'

const emailSchema = z.object({ email: z.email('Enter a valid email address') })
const grantsSchema = z.object({
  grants: z.array(z.enum(PERMISSIONS, { error: 'Unknown permission area' })),
})

export const teamRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

teamRoutes.use('/team/*', requireOwner)

teamRoutes.get('/team/operators', async (c) => {
  return c.json({ items: await listOperators(c.env.DB) })
})

teamRoutes.post('/team/operators', async (c) => {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = emailSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  const [record, created] = await addOperator(c.env.DB, parsed.data.email.trim(), c.get('operator'))
  return c.json(record, created ? 201 : 200)
})

teamRoutes.delete('/team/operators/:id', async (c) => {
  await removeOperator(c.env.DB, Number(c.req.param('id')), c.get('operator'))
  return c.json({ items: await listOperators(c.env.DB) })
})

teamRoutes.put('/team/operators/:id/grants', async (c) => {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = grantsSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return c.json(await replaceGrants(c.env.DB, Number(c.req.param('id')), parsed.data.grants, c.get('operator')))
})

teamRoutes.get('/team/audit', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('per_page') ?? 25)))
  return c.json(await listAudit(c.env.DB, page, perPage))
})
