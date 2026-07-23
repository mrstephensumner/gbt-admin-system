import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getTalentRow } from './serialize'

/**
 * Profile statistics (spec 005 FR-004) — read-only aggregation over existing
 * records. Completeness mirrors the publication gate exactly; every figure is
 * counted, never estimated.
 */
export async function talentStats(d1: D1Database, reference: string) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')

  const thirtyDaysAgo = new Date(Date.parse(nowIso()) - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')

  const [photoCount, topicCount, brandCount, byAction, recent, lastStatusChange] = await Promise.all([
    d1.prepare('SELECT COUNT(*) AS n FROM talent_photo WHERE talent_id = ?').bind(row.id).first<{ n: number }>(),
    d1.prepare('SELECT COUNT(*) AS n FROM talent_topic WHERE talent_id = ?').bind(row.id).first<{ n: number }>(),
    d1.prepare('SELECT COUNT(*) AS n FROM publication WHERE talent_id = ?').bind(row.id).first<{ n: number }>(),
    d1
      .prepare('SELECT action, COUNT(*) AS n FROM change_record WHERE talent_id = ? GROUP BY action')
      .bind(row.id)
      .all<{ action: string; n: number }>(),
    d1
      .prepare('SELECT COUNT(*) AS n FROM change_record WHERE talent_id = ? AND at >= ?')
      .bind(row.id, thirtyDaysAgo)
      .first<{ n: number }>(),
    d1
      .prepare(
        "SELECT at FROM change_record WHERE talent_id = ? AND action = 'status_changed' ORDER BY id DESC LIMIT 1",
      )
      .bind(row.id)
      .first<{ at: string }>(),
  ])

  const missing: string[] = []
  if (!row.day_rate_pence || row.day_rate_pence <= 0) missing.push('day_rate')
  if (!row.biography || row.biography.trim() === '') missing.push('biography')
  if ((photoCount?.n ?? 0) === 0) missing.push('photo')

  const extendedMissing: string[] = []
  if (!row.headline) extendedMissing.push('headline')
  if (!row.location) extendedMissing.push('location')
  if (!row.email && !row.phone) extendedMissing.push('contact')

  const actions = Object.fromEntries(byAction.results.map((a) => [a.action, a.n]))
  const total = byAction.results.reduce((sum, a) => sum + a.n, 0)

  return {
    completeness: {
      publishable: missing.length === 0,
      missing,
      extended_missing: extendedMissing,
    },
    activity: {
      total,
      last_30_days: recent?.n ?? 0,
      by_action: actions,
    },
    facts: {
      created_at: row.created_at,
      created_by: row.created_by,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
      status: row.status,
      status_since: lastStatusChange?.at ?? row.created_at,
      topics: topicCount?.n ?? 0,
      photos: photoCount?.n ?? 0,
      published_brands: brandCount?.n ?? 0,
    },
  }
}
