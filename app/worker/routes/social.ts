import { Hono } from 'hono'
import { z } from 'zod'
import { SOCIAL_PLATFORMS, isHttpsUrl } from '../../shared/social'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import type { AuthzVariables } from '../middleware/authorize'
import {
  addPressMention,
  addSocialLink,
  getSocial,
  removePressMention,
  removeSocialLink,
  updateSocialLink,
} from '../services/social'

const httpsUrl = z
  .string()
  .trim()
  .refine(isHttpsUrl, 'Links must start with https://')

const followers = z.number().int('Follower counts are whole numbers').min(0, 'Follower counts cannot be negative')

const linkCreateSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS, { error: 'Choose a platform from the list' }),
  url: httpsUrl,
  handle: z.string().trim().max(100).nullish(),
  followers: followers.nullish(),
})

const linkUpdateSchema = z.object({
  followers: followers.nullish().optional(),
  url: httpsUrl.optional(),
  handle: z.string().trim().max(100).nullish().optional(),
})

const mentionSchema = z.object({
  title: z.string().trim().min(1, 'Add a headline').max(300),
  outlet: z.string().trim().min(1, 'Name the outlet').max(120),
  url: httpsUrl,
  published_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Give the publication date'),
})

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const socialRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

socialRoutes.get('/talent/:reference/social', async (c) => {
  return c.json(await getSocial(c.env.DB, c.req.param('reference')))
})

socialRoutes.post('/talent/:reference/social/links', async (c) => {
  const input = await body(c, linkCreateSchema)
  return c.json(await addSocialLink(c.env.DB, c.req.param('reference'), input, c.get('operator')), 201)
})

socialRoutes.patch('/social/links/:id', async (c) => {
  const input = await body(c, linkUpdateSchema)
  return c.json(await updateSocialLink(c.env.DB, Number(c.req.param('id')), input, c.get('operator')))
})

socialRoutes.delete('/social/links/:id', async (c) => {
  await removeSocialLink(c.env.DB, Number(c.req.param('id')), c.get('operator'))
  return c.json({ ok: true })
})

socialRoutes.post('/talent/:reference/social/mentions', async (c) => {
  const input = await body(c, mentionSchema)
  return c.json(await addPressMention(c.env.DB, c.req.param('reference'), input, c.get('operator')), 201)
})

socialRoutes.delete('/social/mentions/:id', async (c) => {
  await removePressMention(c.env.DB, Number(c.req.param('id')), c.get('operator'))
  return c.json({ ok: true })
})
