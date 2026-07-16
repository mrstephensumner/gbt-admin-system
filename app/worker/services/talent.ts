import { formatReference } from '../../shared/reference'
import { DEFAULT_TALENT_STATUS, type TalentStatus } from '../../shared/enums'
import type { TalentCreateInput, TalentUpdateInput } from '../../shared/schemas'
import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getTalentRow, serializeTalent, type TalentRow } from './serialize'
import { resolveTopicIds } from './topics'

/**
 * Mutations use D1 `batch()` (implicit transaction) with every dependent
 * statement guarded by the NEW version (`WHERE ... version = ?`), so if the
 * optimistic-lock UPDATE matched nothing, every other statement in the batch
 * matches nothing either — atomic and race-free without interactive
 * transactions (research R6/R7/R9).
 */

/** Atomically allocate the next TAL- number. Gaps from failed creates are fine; reuse is not. */
async function allocateReference(d1: D1Database): Promise<string> {
  const row = await d1
    .prepare('UPDATE ref_counter SET next_number = next_number + 1 WHERE id = 1 RETURNING next_number')
    .first<{ next_number: number }>()
  return formatReference(row!.next_number - 1)
}

export async function createTalent(d1: D1Database, input: TalentCreateInput, actor: string) {
  const reference = await allocateReference(d1)
  const topicIds = await resolveTopicIds(d1, input.topics, actor)
  const now = nowIso()

  const statements: D1PreparedStatement[] = [
    d1
      .prepare(
        `INSERT INTO talent (reference, name, headline, biography, day_rate_pence, location, email, phone, status, version, created_at, created_by, updated_at, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      )
      .bind(
        reference,
        input.name,
        input.headline ?? null,
        input.biography ?? null,
        input.day_rate_pence ?? null,
        input.location ?? null,
        input.email ?? null,
        input.phone ?? null,
        DEFAULT_TALENT_STATUS,
        now,
        actor,
        now,
        actor,
      ),
    ...topicIds.map((tid) =>
      d1.prepare('INSERT INTO talent_topic (talent_id, topic_id) SELECT id, ? FROM talent WHERE reference = ?').bind(tid, reference),
    ),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         SELECT id, ?, 'created', NULL, NULL, ?, ? FROM talent WHERE reference = ?`,
      )
      .bind(actor, reference, now, reference),
  ]
  await d1.batch(statements)

  const row = await getTalentRow(d1, reference)
  return serializeTalent(d1, row!)
}

const EDITABLE_FIELDS = ['name', 'headline', 'biography', 'day_rate_pence', 'location', 'email', 'phone'] as const

export async function updateTalent(d1: D1Database, reference: string, input: TalentUpdateInput, actor: string) {
  const current = await getTalentRow(d1, reference)
  if (!current) throw new ApiError(404, 'not_found', 'No such talent record')
  if (input.version !== current.version) return conflict(d1, current)

  const now = nowIso()
  const newVersion = current.version + 1
  const sets: string[] = []
  const setValues: unknown[] = []
  const changes: { field: string; oldValue: string | null; newValue: string | null }[] = []

  for (const field of EDITABLE_FIELDS) {
    if (!(field in input) || input[field] === undefined) continue
    const next = (input[field] ?? null) as string | number | null
    const prev = current[field]
    if (next === prev) continue
    sets.push(`${field} = ?`)
    setValues.push(next)
    changes.push({
      field,
      oldValue: prev == null ? null : String(prev),
      newValue: next == null ? null : String(next),
    })
  }

  let topicIds: number[] | null = null
  if (input.topics) {
    topicIds = await resolveTopicIds(d1, input.topics, actor)
    const existing = await d1
      .prepare(
        'SELECT t.name FROM topic t JOIN talent_topic tt ON tt.topic_id = t.id WHERE tt.talent_id = ? ORDER BY t.name COLLATE NOCASE',
      )
      .bind(current.id)
      .all<{ name: string }>()
    const nextNames = await namesFor(d1, topicIds)
    const oldJoined = existing.results.map((r) => r.name).join(', ')
    if (nextNames.join(', ') === oldJoined) {
      topicIds = null // no actual change
    } else {
      changes.push({ field: 'topics', oldValue: oldJoined, newValue: nextNames.join(', ') })
    }
  }

  if (sets.length === 0 && topicIds === null) {
    return serializeTalent(d1, current) // nothing to change
  }

  const statements: D1PreparedStatement[] = [
    d1
      .prepare(
        `UPDATE talent SET ${[...sets, 'version = ?', 'updated_at = ?', 'updated_by = ?'].join(', ')} WHERE id = ? AND version = ?`,
      )
      .bind(...setValues, newVersion, now, actor, current.id, current.version),
  ]
  if (topicIds) {
    statements.push(
      d1
        .prepare(
          'DELETE FROM talent_topic WHERE talent_id = ? AND EXISTS (SELECT 1 FROM talent WHERE id = ? AND version = ?)',
        )
        .bind(current.id, current.id, newVersion),
      ...topicIds.map((tid) =>
        d1
          .prepare('INSERT INTO talent_topic (talent_id, topic_id) SELECT id, ? FROM talent WHERE id = ? AND version = ?')
          .bind(tid, current.id, newVersion),
      ),
    )
  }
  statements.push(...changes.map((ch) => guardedChange(d1, current.id, newVersion, actor, 'field_changed', ch.field, ch.oldValue, ch.newValue, now)))

  const results = await d1.batch(statements)
  if ((results[0]?.meta.changes ?? 0) === 0) {
    const fresh = await getTalentRow(d1, reference)
    return conflict(d1, fresh!)
  }
  const row = await getTalentRow(d1, reference)
  return serializeTalent(d1, row!)
}

export async function changeStatus(d1: D1Database, reference: string, status: TalentStatus, version: number, actor: string) {
  const current = await getTalentRow(d1, reference)
  if (!current) throw new ApiError(404, 'not_found', 'No such talent record')
  if (version !== current.version) return conflict(d1, current)
  if (status === current.status) return serializeTalent(d1, current)

  const now = nowIso()
  const newVersion = current.version + 1
  const results = await d1.batch([
    d1
      .prepare('UPDATE talent SET status = ?, version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?')
      .bind(status, newVersion, now, actor, current.id, current.version),
    guardedChange(d1, current.id, newVersion, actor, 'status_changed', 'status', current.status, status, now),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0) return conflict(d1, (await getTalentRow(d1, reference))!)
  return serializeTalent(d1, (await getTalentRow(d1, reference))!)
}

export async function archiveTalent(d1: D1Database, reference: string, version: number, actor: string) {
  const current = await getTalentRow(d1, reference)
  if (!current) throw new ApiError(404, 'not_found', 'No such talent record')
  if (version !== current.version) return conflict(d1, current)
  if (current.archived_at) return serializeTalent(d1, current)

  const now = nowIso()
  const newVersion = current.version + 1
  const pubs = await d1
    .prepare('SELECT b.slug FROM publication p JOIN brand b ON b.id = p.brand_id WHERE p.talent_id = ?')
    .bind(current.id)
    .all<{ slug: string }>()

  const results = await d1.batch([
    d1
      .prepare('UPDATE talent SET archived_at = ?, version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?')
      .bind(now, newVersion, now, actor, current.id, current.version),
    // Auto-unpublish from every brand, disclosed in the UI confirmation (FR-012)
    ...pubs.results.map((p) =>
      guardedChange(d1, current.id, newVersion, actor, 'unpublished', 'publication', p.slug, null, now),
    ),
    d1
      .prepare('DELETE FROM publication WHERE talent_id = ? AND EXISTS (SELECT 1 FROM talent WHERE id = ? AND version = ?)')
      .bind(current.id, current.id, newVersion),
    guardedChange(d1, current.id, newVersion, actor, 'archived', null, null, null, now),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0) return conflict(d1, (await getTalentRow(d1, reference))!)
  return serializeTalent(d1, (await getTalentRow(d1, reference))!)
}

export async function restoreTalent(d1: D1Database, reference: string, version: number, actor: string) {
  const current = await getTalentRow(d1, reference)
  if (!current) throw new ApiError(404, 'not_found', 'No such talent record')
  if (version !== current.version) return conflict(d1, current)
  if (!current.archived_at) return serializeTalent(d1, current)

  const now = nowIso()
  const newVersion = current.version + 1
  // Restore resets status to Available (spec US5)
  const results = await d1.batch([
    d1
      .prepare(
        "UPDATE talent SET archived_at = NULL, status = 'available', version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?",
      )
      .bind(newVersion, now, actor, current.id, current.version),
    guardedChange(d1, current.id, newVersion, actor, 'restored', null, null, null, now),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0) return conflict(d1, (await getTalentRow(d1, reference))!)
  return serializeTalent(d1, (await getTalentRow(d1, reference))!)
}

export async function getHistory(d1: D1Database, reference: string, page: number, perPage: number) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const [items, count] = await Promise.all([
    d1
      .prepare(
        'SELECT id, actor, action, field, old_value, new_value, at FROM change_record WHERE talent_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      )
      .bind(row.id, perPage, (page - 1) * perPage)
      .all(),
    d1.prepare('SELECT COUNT(*) AS n FROM change_record WHERE talent_id = ?').bind(row.id).first<{ n: number }>(),
  ])
  return { items: items.results, total: count!.n, page, per_page: perPage }
}

/** 409 envelope carrying the fresh record so the UI can reconcile (FR-016). */
async function conflict(d1: D1Database, current: TalentRow): Promise<never> {
  throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
    current: await serializeTalent(d1, current),
  })
}

function guardedChange(
  d1: D1Database,
  talentId: number,
  newVersion: number,
  actor: string,
  action: string,
  field: string | null,
  oldValue: string | null,
  newValue: string | null,
  at: string,
): D1PreparedStatement {
  return d1
    .prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       SELECT id, ?, ?, ?, ?, ?, ? FROM talent WHERE id = ? AND version = ?`,
    )
    .bind(actor, action, field, oldValue, newValue, at, talentId, newVersion)
}

async function namesFor(d1: D1Database, ids: number[]): Promise<string[]> {
  if (ids.length === 0) return []
  const res = await d1
    .prepare(`SELECT name FROM topic WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY name COLLATE NOCASE`)
    .bind(...ids)
    .all<{ name: string }>()
  return res.results.map((r) => r.name)
}
