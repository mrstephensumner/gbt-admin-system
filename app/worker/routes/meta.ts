import { Hono } from 'hono'
import type { Env } from '../env'

type Variables = { operator: string }

export const meta = new Hono<{ Bindings: Env; Variables: Variables }>()

/** The Access-derived operator identity, for UI display (contracts/api.md). */
meta.get('/me', (c) => c.json({ email: c.get('operator') }))
