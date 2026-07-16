import { Hono } from 'hono'
import { z } from 'zod'
import { isHttpsUrl } from '../../shared/social'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import type { AuthzVariables } from '../middleware/authorize'
import { addShowreel, getMedia, removeShowreel, upsertSeo } from '../services/media'

const showreelSchema = z.object({
  title: z.string().trim().max(200).nullish(),
  url: z.string().trim().refine(isHttpsUrl, 'Showreel links must start with https://'),
})

const seoSchema = z.object({
  meta_title: z.string().trim().max(300).nullish(),
  meta_description: z.string().trim().max(600).nullish(),
  focus_keyword: z.string().trim().max(120).nullish(),
})

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const mediaRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

mediaRoutes.get('/talent/:reference/media', async (c) => {
  return c.json(await getMedia(c.env.DB, c.req.param('reference')))
})

mediaRoutes.post('/talent/:reference/showreels', async (c) => {
  const input = await body(c, showreelSchema)
  return c.json(await addShowreel(c.env.DB, c.req.param('reference'), input, c.get('operator')), 201)
})

mediaRoutes.delete('/showreels/:id', async (c) => {
  await removeShowreel(c.env.DB, Number(c.req.param('id')), c.get('operator'))
  return c.json({ ok: true })
})

mediaRoutes.put('/talent/:reference/seo', async (c) => {
  const input = await body(c, seoSchema)
  return c.json(await upsertSeo(c.env.DB, c.req.param('reference'), input, c.get('operator')))
})
