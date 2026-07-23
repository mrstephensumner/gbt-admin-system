import { Hono } from 'hono'
import { z } from 'zod'
import { ONBOARDING_STATUSES } from '../../shared/onboarding'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { requirePermission, type AuthzVariables } from '../middleware/authorize'
import { getOnboarding, updateFeeSchedule, updateStep } from '../services/onboarding'

const stepSchema = z.object({
  status: z.enum(ONBOARDING_STATUSES),
  note: z.string().trim().max(500).nullish(),
  version: z.number().int().nonnegative(),
})

const feeSchema = z.object({
  day_rate_pence: z.number().int().nullish(),
  half_day_rate_pence: z.number().int().nullish(),
  after_dinner_rate_pence: z.number().int().nullish(),
  travel_terms: z.string().trim().max(500).nullish().or(z.literal('').transform(() => null)),
  fees_vary_by_site: z.boolean().optional(),
  version: z.number().int().nonnegative(),
})

async function body<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  return parsed.data
}

export const onboardingRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

onboardingRoutes.get('/talent/:reference/onboarding', async (c) =>
  c.json(await getOnboarding(c.env.DB, c.req.param('reference')!)),
)

onboardingRoutes.put('/talent/:reference/onboarding/:stepKey', async (c) => {
  const input = await body(c, stepSchema)
  return c.json(await updateStep(c.env.DB, c.req.param('reference')!, c.req.param('stepKey')!, input, c.get('operator')))
})

// Editing any fee requires the day-rate grant (FR-011).
onboardingRoutes.patch('/talent/:reference/fee-schedule', requirePermission('edit_day_rates'), async (c) => {
  const input = await body(c, feeSchema)
  return c.json(await updateFeeSchedule(c.env.DB, c.req.param('reference')!, input, c.get('operator')))
})
