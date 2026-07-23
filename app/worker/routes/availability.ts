import { Hono } from 'hono'
import { z } from 'zod'
import { AVAILABILITY_STATES, WORKING_WEEKS } from '../../shared/availability'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import type { AuthzVariables } from '../middleware/authorize'
import { createEntry, listMonth, removeEntry, setWorkingWeek, updateEntry } from '../services/availability'

const entrySchema = z.object({
  state: z.enum(AVAILABILITY_STATES),
  title: z.string().trim().min(1, 'Give the entry a title').max(200),
  detail: z.string().trim().max(300).nullish().or(z.literal('').transform(() => null)),
  location: z.string().trim().max(200).nullish().or(z.literal('').transform(() => null)),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be a date'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be a date'),
})

const settingsSchema = z.object({ working_week: z.enum(WORKING_WEEKS) })

const MONTH = /^\d{4}-\d{2}$/

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const availabilityRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

availabilityRoutes.get('/talent/:reference/availability', async (c) => {
  const month = c.req.query('month')
  const resolved = month && MONTH.test(month) ? month : undefined
  return c.json(await listMonth(c.env.DB, c.req.param('reference')!, resolved ?? defaultMonth()))
})

// Static path registered before the :id param route.
availabilityRoutes.patch('/talent/:reference/availability/settings', async (c) => {
  const input = await body(c, settingsSchema)
  return c.json(await setWorkingWeek(c.env.DB, c.req.param('reference')!, input.working_week, c.get('operator')))
})

availabilityRoutes.post('/talent/:reference/availability', async (c) => {
  const input = await body(c, entrySchema)
  return c.json(await createEntry(c.env.DB, c.req.param('reference')!, input, c.get('operator')), 201)
})

availabilityRoutes.patch('/talent/:reference/availability/:id', async (c) => {
  const input = await body(c, entrySchema)
  return c.json(await updateEntry(c.env.DB, c.req.param('reference')!, Number(c.req.param('id')), input, c.get('operator')))
})

availabilityRoutes.delete('/talent/:reference/availability/:id', async (c) =>
  c.json(await removeEntry(c.env.DB, c.req.param('reference')!, Number(c.req.param('id')), c.get('operator'))),
)

function defaultMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
