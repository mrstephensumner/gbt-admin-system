import { FEE_BAND_RANGES, type FeeBandFilter } from '../../shared/feeBands'
import { normaliseReferenceInput } from '../../shared/reference'
import type { DirectoryQuery } from '../../shared/schemas'

/**
 * Directory listing (FR-006/007/008). Plain indexed SQL — comfortably inside
 * the <2s target at 5,000 rows (research R8). Filters compose as WHERE
 * clauses; fee band is a derived rate-range predicate, never a stored column.
 */
export async function listTalent(d1: D1Database, q: DirectoryQuery) {
  const where: string[] = []
  const params: unknown[] = []

  where.push(q.archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL')

  if (q.q) {
    where.push('(name LIKE ? COLLATE NOCASE OR reference LIKE ?)')
    params.push(`%${q.q}%`, `%${normaliseReferenceInput(q.q)}%`)
  }
  for (const topicId of q.topic ?? []) {
    where.push('id IN (SELECT talent_id FROM talent_topic WHERE topic_id = ?)')
    params.push(topicId)
  }
  if (q.status && q.status.length > 0) {
    where.push(`status IN (${q.status.map(() => '?').join(',')})`)
    params.push(...q.status)
  }
  if (q.band) {
    where.push(bandPredicate(q.band, params))
  }

  const whereSql = `WHERE ${where.join(' AND ')}`
  const orderSql = orderBy(q.sort)

  const [countRow, rows] = await Promise.all([
    d1
      .prepare(`SELECT COUNT(*) AS n FROM talent ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>(),
    d1
      .prepare(`SELECT * FROM talent ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
      .bind(...params, q.per_page, (q.page - 1) * q.per_page)
      .all<Record<string, unknown>>(),
  ])

  const ids = rows.results.map((r) => r.id as number)
  const [topicRows, photoRows] = ids.length
    ? await Promise.all([
        d1
          .prepare(
            `SELECT tt.talent_id, t.id, t.name FROM talent_topic tt JOIN topic t ON t.id = tt.topic_id
             WHERE tt.talent_id IN (${ids.map(() => '?').join(',')}) ORDER BY t.name COLLATE NOCASE`,
          )
          .bind(...ids)
          .all<{ talent_id: number; id: number; name: string }>(),
        d1
          .prepare(
            `SELECT talent_id, id FROM talent_photo WHERE is_primary = 1 AND talent_id IN (${ids.map(() => '?').join(',')})`,
          )
          .bind(...ids)
          .all<{ talent_id: number; id: string }>(),
      ])
    : [{ results: [] as { talent_id: number; id: number; name: string }[] }, { results: [] as { talent_id: number; id: string }[] }]

  const topicsByTalent = new Map<number, { id: number; name: string }[]>()
  for (const t of topicRows.results) {
    const list = topicsByTalent.get(t.talent_id) ?? []
    list.push({ id: t.id, name: t.name })
    topicsByTalent.set(t.talent_id, list)
  }
  const photoByTalent = new Map(photoRows.results.map((p) => [p.talent_id, p.id]))

  return {
    items: rows.results.map((r) => ({
      reference: r.reference,
      name: r.name,
      headline: r.headline,
      primaryPhotoUrl: photoByTalent.has(r.id as number)
        ? `/api/photos/${photoByTalent.get(r.id as number)}?size=display`
        : null,
      topics: topicsByTalent.get(r.id as number) ?? [],
      day_rate_pence: r.day_rate_pence,
      status: r.status,
      archived: r.archived_at !== null,
      updated_at: r.updated_at,
    })),
    total: countRow!.n,
    page: q.page,
    per_page: q.per_page,
  }
}

function bandPredicate(band: FeeBandFilter, params: unknown[]): string {
  if (band === 'no_rate') return '(day_rate_pence IS NULL OR day_rate_pence = 0)'
  const { min, max } = FEE_BAND_RANGES[band]
  if (max === null) {
    params.push(min)
    return 'day_rate_pence >= ?'
  }
  params.push(min, max)
  return '(day_rate_pence >= ? AND day_rate_pence < ?)'
}

function orderBy(sort: DirectoryQuery['sort']): string {
  const desc = sort.startsWith('-')
  const key = desc ? sort.slice(1) : sort
  const dir = desc ? 'DESC' : 'ASC'
  switch (key) {
    case 'updated_at':
      return `ORDER BY updated_at ${dir}`
    case 'day_rate':
      return `ORDER BY day_rate_pence IS NULL, day_rate_pence ${dir}`
    default:
      return `ORDER BY name COLLATE NOCASE ${dir}`
  }
}
