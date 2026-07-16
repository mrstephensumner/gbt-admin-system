import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'

/**
 * Resolve a talent payload's topics (existing ids and/or new names — FR-018)
 * to concrete topic ids. New names are created; existing names are reused
 * case-insensitively (idempotent).
 */
export async function resolveTopicIds(
  d1: D1Database,
  topics: (number | string)[],
  actor: string,
): Promise<number[]> {
  const ids: number[] = []
  for (const t of topics) {
    if (typeof t === 'number') {
      const exists = await d1.prepare('SELECT id FROM topic WHERE id = ?').bind(t).first<{ id: number }>()
      if (!exists) throw new ApiError(400, 'unknown_topic', 'One of the selected topics no longer exists')
      ids.push(exists.id)
    } else {
      const existing = await d1
        .prepare('SELECT id FROM topic WHERE name = ? COLLATE NOCASE')
        .bind(t)
        .first<{ id: number }>()
      if (existing) {
        ids.push(existing.id)
      } else {
        const created = await d1
          .prepare('INSERT INTO topic (name, created_at, created_by) VALUES (?, ?, ?) RETURNING id')
          .bind(t, nowIso(), actor)
          .first<{ id: number }>()
        ids.push(created!.id)
      }
    }
  }
  return [...new Set(ids)]
}
