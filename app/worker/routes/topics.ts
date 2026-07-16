import { Hono } from 'hono'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { nowIso } from '../db'
import { topicCreateSchema, topicMergeSchema, topicRenameSchema } from '../../shared/schemas'

type Variables = { operator: string }

export const topicRoutes = new Hono<{ Bindings: Env; Variables: Variables }>()

topicRoutes.get('/topics', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT t.id, t.name, COUNT(tt.talent_id) AS talent_count
     FROM topic t LEFT JOIN talent_topic tt ON tt.topic_id = t.id
     GROUP BY t.id ORDER BY t.name COLLATE NOCASE`,
  ).all<{ id: number; name: string; talent_count: number }>()
  return c.json({ items: rows.results })
})

/** Idempotent on a case-insensitive match (FR-018). */
topicRoutes.post('/topics', async (c) => {
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = topicCreateSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')

  const existing = await c.env.DB.prepare('SELECT id, name FROM topic WHERE name = ? COLLATE NOCASE')
    .bind(parsed.data.name)
    .first<{ id: number; name: string }>()
  if (existing) return c.json(existing)

  const created = await c.env.DB.prepare(
    'INSERT INTO topic (name, created_at, created_by) VALUES (?, ?, ?) RETURNING id, name',
  )
    .bind(parsed.data.name, nowIso(), c.get('operator'))
    .first<{ id: number; name: string }>()
  return c.json(created, 201)
})

topicRoutes.post('/topics/:id/rename', async (c) => {
  const id = Number(c.req.param('id'))
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = topicRenameSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')

  const topic = await c.env.DB.prepare('SELECT id, name FROM topic WHERE id = ?').bind(id).first<{ id: number; name: string }>()
  if (!topic) throw new ApiError(404, 'not_found', 'No such topic')

  const clash = await c.env.DB.prepare('SELECT id FROM topic WHERE name = ? COLLATE NOCASE AND id != ?')
    .bind(parsed.data.name, id)
    .first()
  if (clash) throw new ApiError(409, 'name_taken', 'Another topic already has that name — merge them instead')

  await c.env.DB.prepare('UPDATE topic SET name = ? WHERE id = ?').bind(parsed.data.name, id).run()
  return c.json({ id, name: parsed.data.name })
})

/** Merge :id into `into` — rewrites links, records changes, deletes source (FR-018). */
topicRoutes.post('/topics/:id/merge', async (c) => {
  const sourceId = Number(c.req.param('id'))
  const raw = await c.req.json().catch(() => {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON')
  })
  const parsed = topicMergeSchema.safeParse(raw)
  if (!parsed.success) throw new ApiError(400, 'validation', parsed.error.issues[0]?.message ?? 'Invalid request')
  const targetId = parsed.data.into
  if (sourceId === targetId) throw new ApiError(400, 'merge_self', 'Choose a different topic to merge into')

  const [source, target] = await Promise.all([
    c.env.DB.prepare('SELECT id, name FROM topic WHERE id = ?').bind(sourceId).first<{ id: number; name: string }>(),
    c.env.DB.prepare('SELECT id, name FROM topic WHERE id = ?').bind(targetId).first<{ id: number; name: string }>(),
  ])
  if (!source || !target) throw new ApiError(404, 'not_found', 'No such topic')

  const affected = await c.env.DB.prepare('SELECT talent_id FROM talent_topic WHERE topic_id = ?')
    .bind(sourceId)
    .all<{ talent_id: number }>()
  const now = nowIso()
  const actor = c.get('operator')

  await c.env.DB.batch([
    // Point links at the target, dropping rows that would duplicate an existing link
    c.env.DB.prepare(
      'DELETE FROM talent_topic WHERE topic_id = ? AND talent_id IN (SELECT talent_id FROM talent_topic WHERE topic_id = ?)',
    ).bind(sourceId, targetId),
    c.env.DB.prepare('UPDATE talent_topic SET topic_id = ? WHERE topic_id = ?').bind(targetId, sourceId),
    ...affected.results.map((a) =>
      c.env.DB.prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'topic_merged', 'topics', ?, ?, ?)`,
      ).bind(a.talent_id, actor, source.name, target.name, now),
    ),
    c.env.DB.prepare('DELETE FROM topic WHERE id = ?').bind(sourceId),
  ])

  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM talent_topic WHERE topic_id = ?')
    .bind(targetId)
    .first<{ n: number }>()
  return c.json({ id: target.id, name: target.name, talent_count: count?.n ?? 0 })
})
