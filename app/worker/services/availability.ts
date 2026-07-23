import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { isAvailabilityState, isWorkingWeek, monthBounds } from '../../shared/availability'
import { getTalentRow } from './serialize'

/**
 * Talent availability (spec 012). All-day dated entries, internal-only. Every
 * mutation writes an attributed change record. Never enters publish-safe output.
 */

interface EntryInput {
  state: string
  title: string
  detail?: string | null
  location?: string | null
  start_date: string
  end_date: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

async function requireTalent(d1: D1Database, reference: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  return t
}

function validate(input: EntryInput) {
  if (!isAvailabilityState(input.state)) throw new ApiError(400, 'bad_state', 'Choose a valid availability state')
  if (!input.title || input.title.trim() === '') throw new ApiError(400, 'missing_title', 'Give the entry a title')
  if (!ISO_DATE.test(input.start_date) || !ISO_DATE.test(input.end_date))
    throw new ApiError(422, 'bad_range', 'Dates must be valid')
  if (input.end_date < input.start_date) throw new ApiError(422, 'bad_range', 'The end date cannot be before the start date')
}

async function change(d1: D1Database, talentId: number, actor: string, action: string, field: string, at: string) {
  await d1
    .prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    )
    .bind(talentId, actor, action, field, field, at)
    .run()
}

export async function listMonth(d1: D1Database, reference: string, month: string) {
  const t = await requireTalent(d1, reference)
  const { start, end } = monthBounds(month)
  const rows = await d1
    .prepare(
      `SELECT id, state, title, detail, location, start_date, end_date, updated_by, updated_at
       FROM talent_availability
       WHERE talent_id = ? AND start_date <= ? AND end_date >= ?
       ORDER BY start_date, id`,
    )
    .bind(t.id, end, start)
    .all()
  return { entries: rows.results, working_week: t.working_week ?? 'mon_fri' }
}

export async function createEntry(d1: D1Database, reference: string, input: EntryInput, actor: string) {
  const t = await requireTalent(d1, reference)
  validate(input)
  const now = nowIso()
  const created = await d1
    .prepare(
      `INSERT INTO talent_availability (talent_id, state, title, detail, location, start_date, end_date, created_by, created_at, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(t.id, input.state, input.title.trim(), input.detail ?? null, input.location ?? null, input.start_date, input.end_date, actor, now, actor, now)
    .first<{ id: number }>()
  await change(d1, t.id, actor, 'availability_added', input.title.trim(), now)
  return { id: created!.id }
}

export async function updateEntry(d1: D1Database, reference: string, id: number, input: EntryInput, actor: string) {
  const t = await requireTalent(d1, reference)
  const existing = await d1.prepare('SELECT id FROM talent_availability WHERE id = ? AND talent_id = ?').bind(id, t.id).first()
  if (!existing) throw new ApiError(404, 'not_found', 'No such availability entry')
  validate(input)
  const now = nowIso()
  await d1
    .prepare(
      `UPDATE talent_availability SET state = ?, title = ?, detail = ?, location = ?, start_date = ?, end_date = ?, updated_by = ?, updated_at = ?
       WHERE id = ? AND talent_id = ?`,
    )
    .bind(input.state, input.title.trim(), input.detail ?? null, input.location ?? null, input.start_date, input.end_date, actor, now, id, t.id)
    .run()
  await change(d1, t.id, actor, 'availability_updated', input.title.trim(), now)
  return { id }
}

export async function removeEntry(d1: D1Database, reference: string, id: number, actor: string) {
  const t = await requireTalent(d1, reference)
  const existing = await d1
    .prepare('SELECT title FROM talent_availability WHERE id = ? AND talent_id = ?')
    .bind(id, t.id)
    .first<{ title: string }>()
  if (!existing) throw new ApiError(404, 'not_found', 'No such availability entry')
  const now = nowIso()
  await d1.prepare('DELETE FROM talent_availability WHERE id = ? AND talent_id = ?').bind(id, t.id).run()
  await change(d1, t.id, actor, 'availability_removed', existing.title, now)
  return { ok: true }
}

export async function setWorkingWeek(d1: D1Database, reference: string, workingWeek: string, actor: string) {
  const t = await requireTalent(d1, reference)
  if (!isWorkingWeek(workingWeek)) throw new ApiError(400, 'bad_working_week', 'Choose a valid working week')
  const now = nowIso()
  await d1.prepare('UPDATE talent SET working_week = ? WHERE id = ?').bind(workingWeek, t.id).run()
  await change(d1, t.id, actor, 'working_week_changed', 'working week', now)
  return { working_week: workingWeek }
}
