import { Hono } from 'hono'
import { z } from 'zod'
import { isHttpsUrl } from '../../shared/social'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { requirePermission, type AuthzVariables } from '../middleware/authorize'
import { createSite, listSites, updateSite } from '../services/network'

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name the site').max(120),
  slug: z.string().trim().min(1, 'Add a slug').max(60),
  url: z.string().trim().refine(isHttpsUrl, 'Site address must start with https://').nullish().or(z.literal('').transform(() => null)),
})

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  url: z.string().trim().refine(isHttpsUrl, 'Site address must start with https://').nullish().or(z.literal('').transform(() => null)).optional(),
  active: z.boolean().optional(),
  // Editorial brief for AI enrichment (spec 013).
  brief_audience: z.string().trim().max(500).nullish(),
  brief_tone: z.string().trim().max(200).nullish(),
  brief_wordmin: z.number().int().min(0).max(2000).nullish(),
  brief_wordmax: z.number().int().min(0).max(2000).nullish(),
  brief_include: z.string().trim().max(500).nullish(),
  brief_exclude: z.string().trim().max(500).nullish(),
})

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const networkRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

// Reading the network is baseline (the talent tab needs it); managing requires the grant.
networkRoutes.get('/network', async (c) => c.json(await listSites(c.env.DB)))

networkRoutes.post('/network', requirePermission('network'), async (c) => {
  const input = await body(c, createSchema)
  return c.json(await createSite(c.env.DB, input), 201)
})

networkRoutes.patch('/network/:id', requirePermission('network'), async (c) => {
  const input = await body(c, updateSchema)
  return c.json(await updateSite(c.env.DB, Number(c.req.param('id')), input))
})
