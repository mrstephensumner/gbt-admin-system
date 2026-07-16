import { TALENT_STATUSES } from '../../shared/enums'

/**
 * Dashboard aggregations (spec 004). Read-only; counts are SQL aggregations so
 * a 5,000-record roster costs the same handful of queries as a small one
 * (SC-002). "Complete" mirrors the publication gate exactly: day rate present,
 * biography present, at least one photo (Principle V — one definition).
 */

const COMPLETE_SQL = `
  t.day_rate_pence IS NOT NULL AND t.day_rate_pence > 0
  AND t.biography IS NOT NULL AND TRIM(t.biography) != ''
  AND EXISTS (SELECT 1 FROM talent_photo p WHERE p.talent_id = t.id)
`

export async function dashboardData(d1: D1Database) {
  const [statusRows, brandRows, topicCount, ready, readyCount, blocked, blockedCount, activity] =
    await Promise.all([
      d1
        .prepare('SELECT status, COUNT(*) AS n FROM talent WHERE archived_at IS NULL GROUP BY status')
        .all<{ status: string; n: number }>(),
      d1
        .prepare(
          `SELECT b.slug, b.name, COUNT(p.talent_id) AS n
           FROM brand b
           LEFT JOIN publication p ON p.brand_id = b.id
           LEFT JOIN talent t ON t.id = p.talent_id AND t.archived_at IS NULL
           GROUP BY b.id ORDER BY b.id`,
        )
        .all<{ slug: string; name: string; n: number }>(),
      d1
        .prepare('SELECT COUNT(DISTINCT topic_id) AS n FROM talent_topic tt JOIN talent t ON t.id = tt.talent_id WHERE t.archived_at IS NULL')
        .first<{ n: number }>(),
      d1
        .prepare(
          `SELECT t.reference, t.name, t.updated_at FROM talent t
           WHERE t.archived_at IS NULL AND ${COMPLETE_SQL}
           AND NOT EXISTS (SELECT 1 FROM publication pub WHERE pub.talent_id = t.id)
           ORDER BY t.updated_at DESC LIMIT 6`,
        )
        .all<{ reference: string; name: string; updated_at: string }>(),
      d1
        .prepare(
          `SELECT COUNT(*) AS n FROM talent t
           WHERE t.archived_at IS NULL AND ${COMPLETE_SQL}
           AND NOT EXISTS (SELECT 1 FROM publication pub WHERE pub.talent_id = t.id)`,
        )
        .first<{ n: number }>(),
      d1
        .prepare(
          `SELECT t.reference, t.name,
             CASE WHEN t.day_rate_pence IS NULL OR t.day_rate_pence = 0 THEN 1 ELSE 0 END AS no_rate,
             CASE WHEN t.biography IS NULL OR TRIM(t.biography) = '' THEN 1 ELSE 0 END AS no_bio,
             CASE WHEN NOT EXISTS (SELECT 1 FROM talent_photo p WHERE p.talent_id = t.id) THEN 1 ELSE 0 END AS no_photo
           FROM talent t
           WHERE t.archived_at IS NULL AND NOT (${COMPLETE_SQL})
           ORDER BY t.updated_at DESC LIMIT 6`,
        )
        .all<{ reference: string; name: string; no_rate: number; no_bio: number; no_photo: number }>(),
      d1
        .prepare(`SELECT COUNT(*) AS n FROM talent t WHERE t.archived_at IS NULL AND NOT (${COMPLETE_SQL})`)
        .first<{ n: number }>(),
      d1
        .prepare(
          `SELECT t.reference, t.name, c.actor, c.action, c.field, c.old_value, c.new_value, c.at
           FROM change_record c JOIN talent t ON t.id = c.talent_id
           ORDER BY c.id DESC LIMIT 12`,
        )
        .all<{
          reference: string
          name: string
          actor: string
          action: string
          field: string | null
          old_value: string | null
          new_value: string | null
          at: string
        }>(),
    ])

  const byStatus = Object.fromEntries(TALENT_STATUSES.map((s) => [s, 0])) as Record<string, number>
  let active = 0
  for (const row of statusRows.results) {
    byStatus[row.status] = row.n
    active += row.n
  }

  return {
    counts: {
      active,
      by_status: byStatus,
      published: brandRows.results.map((b) => ({ brand: b.slug, brand_name: b.name, count: b.n })),
      topics: topicCount?.n ?? 0,
    },
    attention: {
      ready_to_publish: { items: ready.results, total: readyCount?.n ?? 0 },
      blocked: {
        items: blocked.results.map((b) => ({
          reference: b.reference,
          name: b.name,
          missing: [
            ...(b.no_rate ? ['day_rate'] : []),
            ...(b.no_bio ? ['biography'] : []),
            ...(b.no_photo ? ['photo'] : []),
          ],
        })),
        total: blockedCount?.n ?? 0,
      },
    },
    activity: activity.results,
  }
}
