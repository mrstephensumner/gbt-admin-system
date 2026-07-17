import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { nowIso } from '../db'
import { getTalentRow } from '../services/serialize'

type Variables = { operator: string }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export const photoRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

/** Edit a photo: set it as the avatar (headshots only) and/or caption it (spec 008 FR-008/009). */
photoRoutes.patch('/photos/:id', async (c) => {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = z
    .object({ is_primary: z.literal(true).optional(), caption: z.string().trim().max(300).nullish().optional() })
    .safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')

  const photo = await c.env.DB.prepare('SELECT id, talent_id, category FROM talent_photo WHERE id = ?')
    .bind(c.req.param('id'))
    .first<{ id: string; talent_id: number; category: string }>()
  if (!photo) throw new ApiError(404, 'not_found', 'No such photo')

  const statements: D1PreparedStatement[] = []
  if (parsed.data.is_primary) {
    if (photo.category !== 'headshot')
      throw new ApiError(422, 'not_headshot', 'Only a headshot can be the profile avatar')
    statements.push(
      c.env.DB.prepare("UPDATE talent_photo SET is_primary = 0 WHERE talent_id = ? AND category = 'headshot'").bind(photo.talent_id),
      c.env.DB.prepare('UPDATE talent_photo SET is_primary = 1 WHERE id = ?').bind(photo.id),
    )
  }
  if (parsed.data.caption !== undefined) {
    statements.push(c.env.DB.prepare('UPDATE talent_photo SET caption = ? WHERE id = ?').bind(parsed.data.caption ?? null, photo.id))
  }
  if (statements.length > 0) await c.env.DB.batch(statements)

  const updated = await c.env.DB.prepare('SELECT id, is_primary, sort_order, category, caption FROM talent_photo WHERE id = ?')
    .bind(photo.id)
    .first<{ id: string; is_primary: number; sort_order: number; category: string; caption: string | null }>()
  return c.json({
    id: updated!.id,
    url: `/api/photos/${updated!.id}?size=display`,
    is_primary: !!updated!.is_primary,
    sort_order: updated!.sort_order,
    category: updated!.category,
    caption: updated!.caption,
  })
})

/** Reorder photos within a category (FR-009): sort_order follows the given id order. */
photoRoutes.put('/talent/:reference/photo-order', async (c) => {
  const row = await getTalentRow(c.env.DB, c.req.param('reference'))
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = z
    .object({ category: z.enum(['headshot', 'event']), ids: z.array(z.string()).max(200) })
    .safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')

  await c.env.DB.batch(
    parsed.data.ids.map((id, index) =>
      c.env.DB.prepare('UPDATE talent_photo SET sort_order = ? WHERE id = ? AND talent_id = ? AND category = ?').bind(
        index,
        id,
        row.id,
        parsed.data.category,
      ),
    ),
  )
  return c.json({ ok: true })
})

/**
 * Photos live in R2 and are served through the Worker so authentication
 * applies (research R4). The display rendition is client-generated (canvas →
 * WebP) and uploaded alongside the original; if absent, the original serves
 * both sizes.
 */
photoRoutes.post('/talent/:reference/photos', async (c) => {
  const row = await getTalentRow(c.env.DB, c.req.param('reference'))
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')

  const form = await c.req.formData().catch(() => {
    throw new ApiError(400, 'invalid_form', 'Send the photo as multipart form data')
  })
  const file = form.get('file')
  if (!(file instanceof File)) throw new ApiError(400, 'missing_file', 'Attach an image file')
  if (!ALLOWED_TYPES.includes(file.type))
    throw new ApiError(400, 'unsupported_type', 'Photos must be JPEG, PNG or WebP')
  if (file.size > MAX_BYTES) throw new ApiError(400, 'too_large', 'Photos must be 10 MB or smaller')

  const display = form.get('display')
  const isPrimary = form.get('is_primary') === 'true'
  const category = form.get('category') === 'event' ? 'event' : 'headshot'
  const id = nanoid(12)
  const keyOriginal = `talent/${row.reference}/${id}-original`
  const keyDisplay = display instanceof File ? `talent/${row.reference}/${id}-display` : keyOriginal

  await c.env.PHOTOS.put(keyOriginal, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })
  if (display instanceof File) {
    await c.env.PHOTOS.put(keyDisplay, await display.arrayBuffer(), {
      httpMetadata: { contentType: display.type || 'image/webp' },
    })
  }

  const existing = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM talent_photo WHERE talent_id = ?')
    .bind(row.id)
    .first<{ n: number }>()
  // Primary/avatar is a headshot concept only (spec 008 FR-002): an event photo
  // is never the avatar. First headshot becomes primary automatically.
  const headshots = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM talent_photo WHERE talent_id = ? AND category = 'headshot'",
  )
    .bind(row.id)
    .first<{ n: number }>()
  const makePrimary = category === 'headshot' && (isPrimary || (headshots?.n ?? 0) === 0)
  const now = nowIso()

  const statements = [
    c.env.DB.prepare(
      `INSERT INTO talent_photo (id, talent_id, r2_key_original, r2_key_display, content_type, is_primary, sort_order, category, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, row.id, keyOriginal, keyDisplay, file.type, makePrimary ? 1 : 0, existing?.n ?? 0, category, now, c.get('operator')),
    c.env.DB.prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       VALUES (?, ?, 'photo_added', 'photo', NULL, ?, ?)`,
    ).bind(row.id, c.get('operator'), id, now),
  ]
  if (makePrimary && (headshots?.n ?? 0) > 0) {
    statements.unshift(
      c.env.DB.prepare("UPDATE talent_photo SET is_primary = 0 WHERE talent_id = ? AND category = 'headshot'").bind(row.id),
    )
  }
  await c.env.DB.batch(statements)

  return c.json(
    { id, url: `/api/photos/${id}?size=display`, is_primary: makePrimary, sort_order: existing?.n ?? 0 },
    201,
  )
})

photoRoutes.delete('/photos/:photoId', async (c) => {
  const photo = await c.env.DB.prepare('SELECT * FROM talent_photo WHERE id = ?')
    .bind(c.req.param('photoId'))
    .first<{ id: string; talent_id: number; r2_key_original: string; r2_key_display: string; is_primary: number }>()
  if (!photo) throw new ApiError(404, 'not_found', 'No such photo')

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM talent_photo WHERE id = ?').bind(photo.id),
    c.env.DB.prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       VALUES (?, ?, 'photo_removed', 'photo', ?, NULL, ?)`,
    ).bind(photo.talent_id, c.get('operator'), photo.id, nowIso()),
  ])
  await c.env.PHOTOS.delete(photo.r2_key_original)
  if (photo.r2_key_display !== photo.r2_key_original) await c.env.PHOTOS.delete(photo.r2_key_display)

  // Primary auto-reassigns to the next photo by sort order
  if (photo.is_primary) {
    // Reassign the avatar among remaining headshots only (FR-002)
    const next = await c.env.DB.prepare(
      "SELECT id FROM talent_photo WHERE talent_id = ? AND category = 'headshot' ORDER BY sort_order, id LIMIT 1",
    )
      .bind(photo.talent_id)
      .first<{ id: string }>()
    if (next) {
      await c.env.DB.prepare('UPDATE talent_photo SET is_primary = 1 WHERE id = ?').bind(next.id).run()
    }
  }

  const remaining = await c.env.DB.prepare(
    'SELECT id, is_primary, sort_order FROM talent_photo WHERE talent_id = ? ORDER BY sort_order, id',
  )
    .bind(photo.talent_id)
    .all<{ id: string; is_primary: number; sort_order: number }>()
  return c.json({
    items: remaining.results.map((p) => ({
      id: p.id,
      url: `/api/photos/${p.id}?size=display`,
      is_primary: !!p.is_primary,
      sort_order: p.sort_order,
    })),
  })
})

photoRoutes.get('/photos/:photoId', async (c) => {
  const photo = await c.env.DB.prepare(
    'SELECT r2_key_original, r2_key_display, content_type FROM talent_photo WHERE id = ?',
  )
    .bind(c.req.param('photoId'))
    .first<{ r2_key_original: string; r2_key_display: string; content_type: string }>()
  if (!photo) throw new ApiError(404, 'not_found', 'No such photo')

  const key = c.req.query('size') === 'original' ? photo.r2_key_original : photo.r2_key_display
  const object = await c.env.PHOTOS.get(key)
  if (!object) throw new ApiError(404, 'not_found', 'Photo file is missing')

  return new Response(object.body as ReadableStream, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? photo.content_type,
      'Cache-Control': 'private, max-age=3600',
    },
  })
})
