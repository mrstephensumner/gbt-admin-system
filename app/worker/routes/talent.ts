import { Hono } from 'hono'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import {
  directoryQuerySchema,
  publicationSchema,
  statusChangeSchema,
  talentCreateSchema,
  talentUpdateSchema,
  versionOnlySchema,
} from '../../shared/schemas'
import { listTalent } from '../services/directory'
import { archiveTalent, changeStatus, createTalent, getHistory, restoreTalent, updateTalent } from '../services/talent'
import { publish, unpublish } from '../services/publication'
import { getTalentRow, serializeTalent } from '../services/serialize'
import { talentStats } from '../services/stats'
import { requirePermission, type AuthzVariables } from '../middleware/authorize'
import { can } from '../../shared/permissions'

export const talentRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

/** Parse+validate a JSON body, converting Zod issues to the 400 envelope (FR-015). */
async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw new ApiError(400, 'validation', parsed.error!.issues[0]?.message ?? 'Invalid request')
  }
  return parsed.data as T
}

talentRoutes.get('/talent', async (c) => {
  const query = directoryQuerySchema.safeParse({
    q: c.req.query('q'),
    topic: c.req.queries('topic'),
    status: c.req.queries('status'),
    band: c.req.query('band'),
    archived: c.req.query('archived'),
    page: c.req.query('page'),
    per_page: c.req.query('per_page'),
    sort: c.req.query('sort'),
  })
  if (!query.success) throw new ApiError(400, 'validation', query.error.issues[0]?.message ?? 'Invalid query')
  return c.json(await listTalent(c.env.DB, query.data))
})

talentRoutes.post('/talent', async (c) => {
  const input = await body(c, talentCreateSchema)
  const talent = await createTalent(c.env.DB, input, c.get('operator'))
  return c.json(talent, 201)
})

talentRoutes.get('/talent/:reference', async (c) => {
  const row = await getTalentRow(c.env.DB, c.req.param('reference'))
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  return c.json(await serializeTalent(c.env.DB, row))
})

talentRoutes.patch('/talent/:reference', async (c) => {
  const input = await body(c, talentUpdateSchema)
  return c.json(
    await updateTalent(c.env.DB, c.req.param('reference'), input, c.get('operator'), {
      canEditDayRates: can(c.get('operatorRecord'), 'edit_day_rates'),
    }),
  )
})

talentRoutes.post('/talent/:reference/status', async (c) => {
  const input = await body(c, statusChangeSchema)
  return c.json(await changeStatus(c.env.DB, c.req.param('reference'), input.status, input.version, c.get('operator')))
})

talentRoutes.post('/talent/:reference/publish', requirePermission('publish'), async (c) => {
  const input = await body(c, publicationSchema)
  return c.json(await publish(c.env.DB, c.req.param('reference')!, input.brand, input.version, c.get('operator')))
})

talentRoutes.post('/talent/:reference/unpublish', requirePermission('publish'), async (c) => {
  const input = await body(c, publicationSchema)
  return c.json(await unpublish(c.env.DB, c.req.param('reference')!, input.brand, input.version, c.get('operator')))
})

talentRoutes.post('/talent/:reference/archive', requirePermission('archive'), async (c) => {
  const input = await body(c, versionOnlySchema)
  return c.json(await archiveTalent(c.env.DB, c.req.param('reference')!, input.version, c.get('operator')))
})

talentRoutes.post('/talent/:reference/restore', requirePermission('archive'), async (c) => {
  const input = await body(c, versionOnlySchema)
  return c.json(await restoreTalent(c.env.DB, c.req.param('reference')!, input.version, c.get('operator')))
})

talentRoutes.get('/talent/:reference/stats', async (c) => {
  return c.json(await talentStats(c.env.DB, c.req.param('reference')))
})

talentRoutes.get('/talent/:reference/history', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('per_page') ?? 25)))
  return c.json(await getHistory(c.env.DB, c.req.param('reference'), page, perPage))
})
