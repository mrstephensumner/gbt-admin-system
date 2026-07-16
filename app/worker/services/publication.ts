import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getTalentRow, serializeTalent } from './serialize'

/**
 * Per-brand publication (FR-009/010/011). A publication row existing means
 * "published to that brand". Gates return the exact missing-item list so the
 * UI shows the spec's factual messages verbatim.
 */

const GATE_MESSAGES: Record<string, string> = {
  day_rate: 'Add a day rate before publishing',
  biography: 'Add a biography before publishing',
  photo: 'Add a photo before publishing',
}

export async function publish(d1: D1Database, reference: string, brandSlug: string, version: number, actor: string) {
  const current = await getTalentRow(d1, reference)
  if (!current) throw new ApiError(404, 'not_found', 'No such talent record')
  if (version !== current.version)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, current),
    })
  if (current.archived_at)
    throw new ApiError(422, 'archived_record', 'Restore this record before publishing')

  const brand = await d1
    .prepare('SELECT id, slug FROM brand WHERE slug = ?')
    .bind(brandSlug)
    .first<{ id: number; slug: string }>()
  if (!brand) throw new ApiError(400, 'unknown_brand', 'No such brand')

  const photoCount = await d1
    .prepare('SELECT COUNT(*) AS n FROM talent_photo WHERE talent_id = ?')
    .bind(current.id)
    .first<{ n: number }>()

  const missing: string[] = []
  if (!current.day_rate_pence || current.day_rate_pence <= 0) missing.push('day_rate')
  if (!current.biography || current.biography.trim() === '') missing.push('biography')
  if ((photoCount?.n ?? 0) === 0) missing.push('photo')
  if (missing.length > 0) {
    throw new ApiError(422, 'incomplete_for_publication', GATE_MESSAGES[missing[0]!]!, { missing })
  }

  const already = await d1
    .prepare('SELECT 1 FROM publication WHERE talent_id = ? AND brand_id = ?')
    .bind(current.id, brand.id)
    .first()
  if (already) return serializeTalent(d1, current)

  const now = nowIso()
  const newVersion = current.version + 1
  const results = await d1.batch([
    d1
      .prepare('UPDATE talent SET version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?')
      .bind(newVersion, now, actor, current.id, current.version),
    d1
      .prepare(
        'INSERT INTO publication (talent_id, brand_id, published_at, published_by) SELECT id, ?, ?, ? FROM talent WHERE id = ? AND version = ?',
      )
      .bind(brand.id, now, actor, current.id, newVersion),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         SELECT id, ?, 'published', 'publication', NULL, ?, ? FROM talent WHERE id = ? AND version = ?`,
      )
      .bind(actor, brand.slug, now, current.id, newVersion),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, (await getTalentRow(d1, reference))!),
    })
  return serializeTalent(d1, (await getTalentRow(d1, reference))!)
}

export async function unpublish(d1: D1Database, reference: string, brandSlug: string, version: number, actor: string) {
  const current = await getTalentRow(d1, reference)
  if (!current) throw new ApiError(404, 'not_found', 'No such talent record')
  if (version !== current.version)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, current),
    })

  const brand = await d1
    .prepare('SELECT id, slug FROM brand WHERE slug = ?')
    .bind(brandSlug)
    .first<{ id: number; slug: string }>()
  if (!brand) throw new ApiError(400, 'unknown_brand', 'No such brand')

  const existing = await d1
    .prepare('SELECT 1 FROM publication WHERE talent_id = ? AND brand_id = ?')
    .bind(current.id, brand.id)
    .first()
  if (!existing) return serializeTalent(d1, current)

  const now = nowIso()
  const newVersion = current.version + 1
  const results = await d1.batch([
    d1
      .prepare('UPDATE talent SET version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?')
      .bind(newVersion, now, actor, current.id, current.version),
    d1
      .prepare(
        'DELETE FROM publication WHERE talent_id = ? AND brand_id = ? AND EXISTS (SELECT 1 FROM talent WHERE id = ? AND version = ?)',
      )
      .bind(current.id, brand.id, current.id, newVersion),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         SELECT id, ?, 'unpublished', 'publication', ?, NULL, ? FROM talent WHERE id = ? AND version = ?`,
      )
      .bind(actor, brand.slug, now, current.id, newVersion),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, (await getTalentRow(d1, reference))!),
    })
  return serializeTalent(d1, (await getTalentRow(d1, reference))!)
}
