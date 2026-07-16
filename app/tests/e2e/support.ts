import type { APIRequestContext } from '@playwright/test'

/** Create a talent record through the real API (dev identity applies). */
export async function apiCreateTalent(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {},
): Promise<{ reference: string; version: number }> {
  const res = await request.post('/api/talent', {
    data: {
      name: 'E2E Person',
      headline: 'End-to-end test speaker',
      biography: 'A biography long enough to publish.',
      day_rate_pence: 400_000,
      location: 'London, UK',
      topics: ['E2E testing'],
      ...overrides,
    },
  })
  if (res.status() !== 201) throw new Error(`apiCreateTalent: ${res.status()} ${await res.text()}`)
  return (await res.json()) as { reference: string; version: number }
}

export async function apiUploadPhoto(request: APIRequestContext, reference: string) {
  const res = await request.post(`/api/talent/${reference}/photos`, {
    multipart: {
      file: {
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3, 4]),
      },
    },
  })
  if (res.status() !== 201) throw new Error(`apiUploadPhoto: ${res.status()} ${await res.text()}`)
  return (await res.json()) as { id: string }
}

export function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`
}
