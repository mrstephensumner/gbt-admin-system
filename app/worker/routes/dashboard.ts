import { Hono } from 'hono'
import type { Env } from '../env'
import type { AuthzVariables } from '../middleware/authorize'
import { dashboardData } from '../services/dashboard'

export const dashboardRoutes = new Hono<{ Bindings: Env; Variables: AuthzVariables }>()

/** Read-only aggregation; baseline permission — any registered operator (FR-006). */
dashboardRoutes.get('/dashboard', async (c) => c.json(await dashboardData(c.env.DB)))
