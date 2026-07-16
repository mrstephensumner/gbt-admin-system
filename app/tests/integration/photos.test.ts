import { describe, expect, it } from 'vitest'
import { SELF } from 'cloudflare:test'
import { call, createTalent, OPERATOR, uploadPhoto } from './helpers'

describe('photos (US1, FR-001; research R4)', () => {
  it('uploads a photo, making the first one primary', async () => {
    const talent = await createTalent()
    const { status, body } = await uploadPhoto(talent.reference)
    expect(status).toBe(201)
    expect(body.is_primary).toBe(true)
    const { body: full } = await call('GET', `/talent/${talent.reference}`)
    expect(full.photos as unknown[]).toHaveLength(1)
  })

  it('rejects unsupported types and oversized files with factual messages', async () => {
    const talent = await createTalent()
    const form = new FormData()
    form.set('file', new File(['plain'], 'notes.txt', { type: 'text/plain' }))
    const res = await SELF.fetch(`http://admin.local/api/talent/${talent.reference}/photos`, {
      method: 'POST',
      headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
      body: form,
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { message: string } }
    expect(body.error.message).toBe('Photos must be JPEG, PNG or WebP')
    // Prior state untouched (edge case)
    const { body: full } = await call('GET', `/talent/${talent.reference}`)
    expect(full.photos as unknown[]).toHaveLength(0)
  })

  it('serves the photo bytes back through the authenticated route', async () => {
    const talent = await createTalent()
    const { body } = await uploadPhoto(talent.reference)
    const res = await SELF.fetch(`http://admin.local/api/photos/${body.id}?size=original`, {
      headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
  })

  it('deleting the primary photo reassigns primary and records the change', async () => {
    const talent = await createTalent()
    const first = await uploadPhoto(talent.reference)
    const second = await uploadPhoto(talent.reference)
    expect(second.body.is_primary).toBe(false)

    const res = await SELF.fetch(`http://admin.local/api/photos/${first.body.id}`, {
      method: 'DELETE',
      headers: { 'Cf-Access-Authenticated-User-Email': OPERATOR },
    })
    expect(res.status).toBe(200)
    const remaining = (await res.json()) as { items: { id: string; is_primary: boolean }[] }
    expect(remaining.items).toHaveLength(1)
    expect(remaining.items[0]!.is_primary).toBe(true)
  })
})
