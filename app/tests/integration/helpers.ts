import { env, SELF } from 'cloudflare:test'

export const OPERATOR = 'test@greatbritishtalent.online'

/** Call the API through the real Worker (identity via dev header). */
export async function call(
  method: string,
  path: string,
  payload?: unknown,
  operator = OPERATOR,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const init: RequestInit = {
    method,
    headers: { 'Cf-Access-Authenticated-User-Email': operator },
  }
  if (payload !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' }
    init.body = JSON.stringify(payload)
  }
  const res = await SELF.fetch(`http://admin.local/api${path}`, init)
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { status: res.status, body }
}

export async function seedBrand(slug = 'great-british-speakers', name = 'Great British Speakers') {
  await env.DB.prepare('INSERT OR IGNORE INTO brand (slug, name, created_at) VALUES (?, ?, ?)')
    .bind(slug, name, '2026-07-16T00:00:00Z')
    .run()
}

export async function createTalent(overrides: Record<string, unknown> = {}) {
  const { status, body } = await call('POST', '/talent', {
    name: 'Raj Patel',
    headline: 'Leadership speaker',
    biography: 'A long biography.',
    day_rate_pence: 450_000,
    location: 'Leeds, UK',
    email: 'raj@example.com',
    phone: '+44 7700 900001',
    topics: ['Leadership'],
    ...overrides,
  })
  if (status !== 201) throw new Error(`createTalent failed: ${status} ${JSON.stringify(body)}`)
  return body as { reference: string; version: number; [k: string]: unknown }
}

export async function uploadPhoto(reference: string) {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' }))
  const res = await SELF.fetch(`http://admin.local/api/talent/${reference}/photos`, {
    method: 'POST',
    headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    body: form,
  })
  const body = (await res.json()) as Record<string, unknown>
  return { status: res.status, body }
}

export async function history(reference: string) {
  const { body } = await call('GET', `/talent/${reference}/history`)
  return body.items as { action: string; field: string | null; old_value: string | null; new_value: string | null; actor: string }[]
}
