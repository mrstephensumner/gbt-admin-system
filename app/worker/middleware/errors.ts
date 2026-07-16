import type { Context } from 'hono'

/**
 * Error envelope (contracts/api.md): { error: { code, message }, ...extras }.
 * Messages are operator-facing: brief, factual, sentence case (FR-015).
 * Wired via app.onError — Hono routes handler throws there, not through
 * middleware try/catch.
 */
export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
    public code: string,
    message: string,
    public extras: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

export function errorEnvelope(err: Error, c: Context): Response {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message }, ...err.extras }, err.status)
  }
  console.error('Unhandled error', err)
  return c.json({ error: { code: 'internal', message: 'Something went wrong' } }, 500)
}
