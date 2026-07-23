import { Hono } from 'hono'
import { z } from 'zod'
import { MAX_APPROVE_PER_REQUEST } from '../../shared/importing'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { requirePermission, type AuthzVariables } from '../middleware/authorize'
import {
  approveCandidates,
  clearStaging,
  editCandidate,
  listCandidates,
  listRuns,
  runImport,
  skipCandidate,
} from '../services/importing'

const runSchema = z.object({
  file_name: z.string().trim().min(1, 'Name the file').max(200),
  dry_run: z.boolean().default(false),
  rows: z.array(z.unknown()),
})

const editSchema = z.object({
  name: z.string().trim().min(1, 'Add a name').max(200).optional(),
  headline: z.string().trim().max(200).nullish().optional(),
  biography: z.string().trim().nullish().optional(),
  topics: z.array(z.string().trim().min(1).max(60)).optional(),
  day_rate_pence: z.number().int().min(0).nullish().optional(),
  location: z.string().trim().max(200).nullish().optional(),
  email: z.email('Enter a valid email address').nullish().or(z.literal('').transform(() => null)).optional(),
  phone: z.string().trim().max(50).nullish().optional(),
})

const approveSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1, 'Select at least one candidate')
    .max(MAX_APPROVE_PER_REQUEST, `Approve at most ${MAX_APPROVE_PER_REQUEST} candidates per request`),
})

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const importRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

// Every import action requires the import_roster grant (spec 003 FR-013)
importRoutes.use('/import/*', requirePermission('import_roster'))

importRoutes.post('/import/runs', async (c) => {
  const input = await body(c, runSchema)
  return c.json(await runImport(c.env.DB, input.file_name, input.rows, input.dry_run, c.get('operator')))
})

importRoutes.get('/import/runs', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('per_page') ?? 10)))
  return c.json(await listRuns(c.env.DB, page, perPage))
})

importRoutes.get('/import/candidates', async (c) => {
  const status = c.req.query('status') ?? 'new'
  if (!['new', 'imported', 'skipped'].includes(status))
    throw new ApiError(400, 'validation', 'Unknown candidate status')
  const page = Math.max(1, Number(c.req.query('page') ?? 1))
  const perPage = Math.min(100, Math.max(1, Number(c.req.query('per_page') ?? 25)))
  return c.json(
    await listCandidates(c.env.DB, status as 'new' | 'imported' | 'skipped', c.req.query('q'), page, perPage),
  )
})

importRoutes.patch('/import/candidates/:id', async (c) => {
  const input = await body(c, editSchema)
  return c.json(await editCandidate(c.env.DB, Number(c.req.param('id')), input))
})

importRoutes.post('/import/candidates/:id/skip', async (c) => {
  return c.json(await skipCandidate(c.env.DB, Number(c.req.param('id')), c.get('operator')))
})

importRoutes.post('/import/approve', async (c) => {
  const input = await body(c, approveSchema)
  return c.json(await approveCandidates(c.env.DB, c.env.PHOTOS, input.ids, c.get('operator')))
})

importRoutes.delete('/import/candidates', async (c) => {
  return c.json(await clearStaging(c.env.DB))
})
