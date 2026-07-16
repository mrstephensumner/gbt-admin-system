import { videoInfo } from '../../shared/media'
import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getTalentRow } from './serialize'

/**
 * Media manager server side (spec 008): showreel links (provider derived from
 * URL) and per-talent SEO metadata (upserted). Photos live in the existing
 * photo pipeline; this service adds the video + SEO halves. Add/remove and SEO
 * saves write attributed change records (FR-004/005).
 */
export async function getMedia(d1: D1Database, reference: string) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const [showreels, seo] = await Promise.all([
    d1
      .prepare('SELECT id, title, url, provider, created_at, created_by FROM talent_showreel WHERE talent_id = ? ORDER BY id DESC')
      .bind(row.id)
      .all(),
    d1
      .prepare('SELECT meta_title, meta_description, focus_keyword, updated_at, updated_by FROM talent_seo WHERE talent_id = ?')
      .bind(row.id)
      .first(),
  ])
  return {
    showreels: showreels.results.map((s) => ({
      ...s,
      thumbnail: videoInfo(s.url as string).thumbnail,
    })),
    seo: seo ?? null,
  }
}

export async function addShowreel(
  d1: D1Database,
  reference: string,
  input: { title?: string | null; url: string },
  actor: string,
) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const provider = videoInfo(input.url).provider
  const now = nowIso()
  await d1.batch([
    d1
      .prepare('INSERT INTO talent_showreel (talent_id, title, url, provider, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(row.id, input.title ?? null, input.url, provider, now, actor),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'showreel_added', 'showreel', NULL, ?, ?)`,
      )
      .bind(row.id, actor, provider, now),
  ])
  const created = await d1
    .prepare('SELECT id, title, url, provider, created_at, created_by FROM talent_showreel WHERE talent_id = ? ORDER BY id DESC LIMIT 1')
    .bind(row.id)
    .first<{ url: string }>()
  return { ...created, thumbnail: videoInfo(created!.url).thumbnail }
}

export async function removeShowreel(d1: D1Database, id: number, actor: string) {
  const s = await d1
    .prepare('SELECT id, talent_id, provider FROM talent_showreel WHERE id = ?')
    .bind(id)
    .first<{ id: number; talent_id: number; provider: string }>()
  if (!s) throw new ApiError(404, 'not_found', 'No such showreel')
  await d1.batch([
    d1.prepare('DELETE FROM talent_showreel WHERE id = ?').bind(id),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'showreel_removed', 'showreel', ?, NULL, ?)`,
      )
      .bind(s.talent_id, actor, s.provider, nowIso()),
  ])
}

export async function upsertSeo(
  d1: D1Database,
  reference: string,
  input: { meta_title?: string | null; meta_description?: string | null; focus_keyword?: string | null },
  actor: string,
) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const now = nowIso()
  await d1.batch([
    d1
      .prepare(
        `INSERT INTO talent_seo (talent_id, meta_title, meta_description, focus_keyword, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(talent_id) DO UPDATE SET
           meta_title = excluded.meta_title,
           meta_description = excluded.meta_description,
           focus_keyword = excluded.focus_keyword,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`,
      )
      .bind(row.id, input.meta_title ?? null, input.meta_description ?? null, input.focus_keyword ?? null, now, actor),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'seo_updated', 'seo', NULL, NULL, ?)`,
      )
      .bind(row.id, actor, now),
  ])
  return d1
    .prepare('SELECT meta_title, meta_description, focus_keyword, updated_at, updated_by FROM talent_seo WHERE talent_id = ?')
    .bind(row.id)
    .first()
}
