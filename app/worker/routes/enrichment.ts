import { Hono } from 'hono'
import { z } from 'zod'
import { ENRICHMENT_MODELS } from '../../shared/enrichment'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { requireOwner, type AuthzVariables } from '../middleware/authorize'
import { can } from '../../shared/permissions'
import {
  approve,
  editBio,
  generate,
  getEnrichment,
  getSettings,
  publish,
  setSettings,
  setSourceMaterial,
} from '../services/enrichment'

const MODEL_IDS = ENRICHMENT_MODELS.map((m) => m.id) as [string, ...string[]]

const settingsSchema = z.object({
  api_key: z.string().trim().max(200).optional(),
  model: z.enum(MODEL_IDS).optional(),
  banned_words: z.array(z.string().trim().max(80)).max(200).optional(),
  house_style: z.string().trim().max(1000).nullish(),
})
const sourceSchema = z.object({ source_material: z.string().trim().max(4000).nullable() })
const editSchema = z.object({ body: z.string().trim().min(1, 'The bio cannot be empty').max(4000) })
const approveSchema = z.object({ by: z.enum(['admin', 'talent']), talent_name: z.string().trim().max(120).optional() })

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const enrichmentRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

// Settings — owner only.
enrichmentRoutes.get('/enrichment/settings', requireOwner, async (c) => c.json(await getSettings(c.env.DB)))
enrichmentRoutes.put('/enrichment/settings', requireOwner, async (c) =>
  c.json(await setSettings(c.env, c.env.DB, await body(c, settingsSchema), c.get('operator'))),
)

enrichmentRoutes.get('/talent/:reference/enrichment', async (c) => c.json(await getEnrichment(c.env.DB, c.req.param('reference')!)))

enrichmentRoutes.put('/talent/:reference/source-material', async (c) => {
  const input = await body(c, sourceSchema)
  return c.json(await setSourceMaterial(c.env.DB, c.req.param('reference')!, input.source_material, c.get('operator')))
})

enrichmentRoutes.post('/talent/:reference/enrichment/:brandId/generate', async (c) =>
  c.json(await generate(c.env, c.env.DB, c.req.param('reference')!, Number(c.req.param('brandId')), c.get('operator'))),
)

enrichmentRoutes.patch('/talent/:reference/enrichment/:brandId', async (c) => {
  const input = await body(c, editSchema)
  return c.json(await editBio(c.env.DB, c.req.param('reference')!, Number(c.req.param('brandId')), input.body, c.get('operator')))
})

enrichmentRoutes.post('/talent/:reference/enrichment/:brandId/approve', async (c) => {
  const input = await body(c, approveSchema)
  // Admin approval requires an admin (owner). Talent approval is an operator-recorded attestation.
  if (input.by === 'admin' && c.get('operatorRecord').role !== 'owner' && !can(c.get('operatorRecord'), 'publish'))
    throw new ApiError(403, 'forbidden', 'Only an admin can approve enriched bios — ask the owner')
  return c.json(
    await approve(c.env.DB, c.req.param('reference')!, Number(c.req.param('brandId')), input.by, input.talent_name, c.get('operator')),
  )
})

enrichmentRoutes.post('/talent/:reference/enrichment/:brandId/publish', async (c) =>
  c.json(await publish(c.env.DB, c.req.param('reference')!, Number(c.req.param('brandId')), c.get('operator'))),
)
