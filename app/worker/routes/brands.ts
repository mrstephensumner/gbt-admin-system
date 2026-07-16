import { Hono } from 'hono'
import type { Env } from '../env'

type Variables = { operator: string }

export const brandRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

brandRoutes.get('/brands', async (c) => {
  const rows = await c.env.DB.prepare('SELECT id, slug, name FROM brand ORDER BY id').all()
  return c.json({ items: rows.results })
})
