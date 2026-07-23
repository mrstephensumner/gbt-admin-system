import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getTalentRow } from './serialize'

/**
 * Internal talent notes (spec 006) — append-only, attributed, internal-only.
 * Adding a note also writes a `note_added` change record in the same batch,
 * so History, the dashboard feed, and Statistics count it (FR-004).
 */
export async function listNotes(d1: D1Database, reference: string, page: number, perPage: number) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const [items, count] = await Promise.all([
    d1
      .prepare('SELECT id, author, body, created_at FROM talent_note WHERE talent_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
      .bind(row.id, perPage, (page - 1) * perPage)
      .all(),
    d1.prepare('SELECT COUNT(*) AS n FROM talent_note WHERE talent_id = ?').bind(row.id).first<{ n: number }>(),
  ])
  return { items: items.results, total: count!.n, page, per_page: perPage }
}

export async function addNote(d1: D1Database, reference: string, body: string, actor: string) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const now = nowIso()
  await d1.batch([
    d1
      .prepare('INSERT INTO talent_note (talent_id, author, body, created_at) VALUES (?, ?, ?, ?)')
      .bind(row.id, actor, body, now),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'note_added', 'notes', NULL, NULL, ?)`,
      )
      .bind(row.id, actor, now),
  ])
  const created = await d1
    .prepare('SELECT id, author, body, created_at FROM talent_note WHERE talent_id = ? ORDER BY id DESC LIMIT 1')
    .bind(row.id)
    .first()
  return created
}
