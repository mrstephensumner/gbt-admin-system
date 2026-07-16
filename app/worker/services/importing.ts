import {
  MAX_ROWS_PER_UPLOAD,
  normalisedRowSchema,
  parseGbpToPence,
  type NormalisedRow,
} from '../../shared/importing'
import { talentCreateSchema } from '../../shared/schemas'
import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { createTalent } from './talent'
import { getTalentRow } from './serialize'

/**
 * Import staging (spec 003). Validation and staging share one code path
 * (research R2): dry_run skips writes but reports identically. Candidates are
 * keyed by source_id; imported/skipped rows are immune to re-uploads (FR-010).
 * Approval only ever calls the spec-001 CREATE path — imports can never modify
 * existing talent (FR-011 by construction).
 */

interface CandidateRow {
  id: number
  source_id: string
  name: string
  headline: string | null
  biography: string | null
  topics_json: string
  day_rate_pence: number | null
  location: string | null
  email: string | null
  phone: string | null
  photo_url: string | null
  gaps_json: string
  duplicate_of: string | null
  status: 'new' | 'imported' | 'skipped'
  talent_reference: string | null
  first_seen_at: string
  updated_at: string
  decided_at: string | null
  decided_by: string | null
}

export function serializeCandidate(row: CandidateRow) {
  return {
    id: row.id,
    source_id: row.source_id,
    name: row.name,
    headline: row.headline,
    biography: row.biography,
    topics: JSON.parse(row.topics_json) as string[],
    day_rate_pence: row.day_rate_pence,
    location: row.location,
    email: row.email,
    phone: row.phone,
    photo_url: row.photo_url,
    gaps: JSON.parse(row.gaps_json) as string[],
    duplicate_of: row.duplicate_of,
    status: row.status,
    talent_reference: row.talent_reference,
    first_seen_at: row.first_seen_at,
    updated_at: row.updated_at,
  }
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function runImport(
  d1: D1Database,
  fileName: string,
  rows: unknown[],
  dryRun: boolean,
  actor: string,
) {
  if (rows.length > MAX_ROWS_PER_UPLOAD)
    throw new ApiError(400, 'too_many_rows', `Files are limited to ${MAX_ROWS_PER_UPLOAD.toLocaleString('en-GB')} rows`)

  const problems: { row: number; reason: string }[] = []
  const clean: { row: NormalisedRow; gaps: string[]; dayRate: number | null }[] = []
  const seenIds = new Set<string>()

  rows.forEach((raw, index) => {
    const rowNo = index + 1
    const parsed = normalisedRowSchema.safeParse(raw)
    if (!parsed.success) {
      problems.push({ row: rowNo, reason: parsed.error.issues[0]?.message ?? 'Row is unreadable' })
      return
    }
    const row = parsed.data
    const key = row.source_id.toLowerCase()
    if (seenIds.has(key)) {
      problems.push({ row: rowNo, reason: `Duplicate talent identifier in file: ${row.source_id}` })
      return
    }
    seenIds.add(key)

    const gaps: string[] = []
    const dayRate = parseGbpToPence(row.day_rate_raw)
    if (row.day_rate_raw && dayRate === null) gaps.push(`Day rate unreadable: "${row.day_rate_raw}"`)
    if (!row.day_rate_raw) gaps.push('No day rate in file')
    if (!row.biography) gaps.push('No biography in file')
    if (!row.photo_url) gaps.push('No photo in file')
    if (row.topics.length === 0) gaps.push('No topics in file — add one before approving')
    if (row.email && !EMAIL_SHAPE.test(row.email)) gaps.push(`Email looks invalid: "${row.email}"`)

    clean.push({ row, gaps, dayRate })
  })

  let stagedNew = 0
  let refreshed = 0
  let untouchedImported = 0
  let untouchedSkipped = 0
  const now = nowIso()

  // Existing candidates by source_id (case-insensitive), for upsert decisions
  const existing = new Map<string, { id: number; status: string }>()
  if (clean.length > 0) {
    const all = await d1
      .prepare('SELECT id, source_id, status FROM import_candidate')
      .all<{ id: number; source_id: string; status: string }>()
    for (const c of all.results) existing.set(c.source_id.toLowerCase(), { id: c.id, status: c.status })
  }

  const statements: D1PreparedStatement[] = []
  for (const { row, gaps, dayRate } of clean) {
    const prior = existing.get(row.source_id.toLowerCase())
    if (prior && prior.status === 'imported') {
      untouchedImported++
      continue
    }
    if (prior && prior.status === 'skipped') {
      untouchedSkipped++
      continue
    }

    // Possible-duplicate flag: name matches an existing active talent (FR-012)
    const dupe = await d1
      .prepare('SELECT reference FROM talent WHERE name = ? COLLATE NOCASE AND archived_at IS NULL LIMIT 1')
      .bind(row.name)
      .first<{ reference: string }>()

    const email = row.email && EMAIL_SHAPE.test(row.email) ? row.email : null
    if (prior) {
      refreshed++
      statements.push(
        d1
          .prepare(
            `UPDATE import_candidate SET name = ?, headline = ?, biography = ?, topics_json = ?, day_rate_pence = ?,
             location = ?, email = ?, phone = ?, photo_url = ?, gaps_json = ?, duplicate_of = ?, updated_at = ?
             WHERE id = ? AND status = 'new'`,
          )
          .bind(
            row.name,
            row.headline ?? null,
            row.biography ?? null,
            JSON.stringify(row.topics),
            dayRate,
            row.location ?? null,
            email,
            row.phone ?? null,
            row.photo_url ?? null,
            JSON.stringify(gaps),
            dupe?.reference ?? null,
            now,
            prior.id,
          ),
      )
    } else {
      stagedNew++
      statements.push(
        d1
          .prepare(
            `INSERT INTO import_candidate (source_id, name, headline, biography, topics_json, day_rate_pence,
             location, email, phone, photo_url, gaps_json, duplicate_of, status, first_seen_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
          )
          .bind(
            row.source_id,
            row.name,
            row.headline ?? null,
            row.biography ?? null,
            JSON.stringify(row.topics),
            dayRate,
            row.location ?? null,
            email,
            row.phone ?? null,
            row.photo_url ?? null,
            JSON.stringify(gaps),
            dupe?.reference ?? null,
            now,
            now,
          ),
      )
    }
  }

  if (!dryRun && statements.length > 0) {
    // Chunked batches keep well inside D1 statement limits at 5,000 rows
    for (let i = 0; i < statements.length; i += 100) {
      await d1.batch(statements.slice(i, i + 100))
    }
  }

  const run = await d1
    .prepare(
      `INSERT INTO import_run (file_name, operator, at, rows_found, rows_staged, rows_problem, problems_json, dry_run)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      fileName,
      actor,
      now,
      rows.length,
      dryRun ? 0 : stagedNew + refreshed,
      problems.length,
      JSON.stringify(problems.slice(0, 200)),
      dryRun ? 1 : 0,
    )
    .first<{ id: number }>()

  return {
    run_id: run!.id,
    dry_run: dryRun,
    rows_found: rows.length,
    rows_clean: clean.length,
    rows_problem: problems.length,
    problems,
    staged_new: dryRun ? 0 : stagedNew,
    refreshed: dryRun ? 0 : refreshed,
    untouched_imported: untouchedImported,
    untouched_skipped: untouchedSkipped,
  }
}

export async function listRuns(d1: D1Database, page: number, perPage: number) {
  const [rows, count] = await Promise.all([
    d1
      .prepare(
        'SELECT id, file_name, operator, at, rows_found, rows_staged, rows_problem, dry_run FROM import_run ORDER BY id DESC LIMIT ? OFFSET ?',
      )
      .bind(perPage, (page - 1) * perPage)
      .all(),
    d1.prepare('SELECT COUNT(*) AS n FROM import_run').first<{ n: number }>(),
  ])
  return { items: rows.results, total: count!.n, page, per_page: perPage }
}

export async function listCandidates(
  d1: D1Database,
  status: 'new' | 'imported' | 'skipped',
  q: string | undefined,
  page: number,
  perPage: number,
) {
  const where = ['status = ?']
  const params: unknown[] = [status]
  if (q) {
    where.push('name LIKE ? COLLATE NOCASE')
    params.push(`%${q}%`)
  }
  const whereSql = `WHERE ${where.join(' AND ')}`
  const [rows, count] = await Promise.all([
    d1
      .prepare(`SELECT * FROM import_candidate ${whereSql} ORDER BY name COLLATE NOCASE LIMIT ? OFFSET ?`)
      .bind(...params, perPage, (page - 1) * perPage)
      .all<CandidateRow>(),
    d1
      .prepare(`SELECT COUNT(*) AS n FROM import_candidate ${whereSql}`)
      .bind(...params)
      .first<{ n: number }>(),
  ])
  return { items: rows.results.map(serializeCandidate), total: count!.n, page, per_page: perPage }
}

async function getCandidate(d1: D1Database, id: number): Promise<CandidateRow> {
  const row = await d1.prepare('SELECT * FROM import_candidate WHERE id = ?').bind(id).first<CandidateRow>()
  if (!row) throw new ApiError(404, 'not_found', 'No such import candidate')
  return row
}

export async function editCandidate(
  d1: D1Database,
  id: number,
  fields: Partial<Pick<CandidateRow, 'name' | 'headline' | 'biography' | 'location' | 'email' | 'phone'>> & {
    topics?: string[]
    day_rate_pence?: number | null
  },
) {
  const row = await getCandidate(d1, id)
  if (row.status !== 'new') throw new ApiError(422, 'not_reviewable', 'Only new candidates can be edited')

  const next = {
    name: fields.name?.trim() || row.name,
    headline: fields.headline !== undefined ? fields.headline : row.headline,
    biography: fields.biography !== undefined ? fields.biography : row.biography,
    topics_json: fields.topics !== undefined ? JSON.stringify(fields.topics) : row.topics_json,
    day_rate_pence: fields.day_rate_pence !== undefined ? fields.day_rate_pence : row.day_rate_pence,
    location: fields.location !== undefined ? fields.location : row.location,
    email: fields.email !== undefined ? fields.email : row.email,
    phone: fields.phone !== undefined ? fields.phone : row.phone,
  }
  await d1
    .prepare(
      `UPDATE import_candidate SET name = ?, headline = ?, biography = ?, topics_json = ?, day_rate_pence = ?,
       location = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(
      next.name,
      next.headline,
      next.biography,
      next.topics_json,
      next.day_rate_pence,
      next.location,
      next.email,
      next.phone,
      nowIso(),
      id,
    )
    .run()
  return serializeCandidate(await getCandidate(d1, id))
}

export async function skipCandidate(d1: D1Database, id: number, actor: string) {
  const row = await getCandidate(d1, id)
  if (row.status !== 'new') throw new ApiError(422, 'not_reviewable', 'Only new candidates can be skipped')
  await d1
    .prepare("UPDATE import_candidate SET status = 'skipped', decided_at = ?, decided_by = ? WHERE id = ?")
    .bind(nowIso(), actor, id)
    .run()
  return serializeCandidate(await getCandidate(d1, id))
}

/** Approve one candidate: spec-001 create path + best-effort photo fetch (R4). */
async function approveOne(d1: D1Database, photos: R2Bucket, id: number, actor: string) {
  const row = await getCandidate(d1, id)
  if (row.status !== 'new') throw new ApiError(422, 'not_reviewable', 'Candidate has already been decided')

  const topics = JSON.parse(row.topics_json) as string[]
  // Same validation as manual creation (FR-007) — the shared schema is the rulebook
  const input = talentCreateSchema.safeParse({
    name: row.name,
    headline: row.headline,
    biography: row.biography,
    day_rate_pence: row.day_rate_pence,
    location: row.location,
    email: row.email,
    phone: row.phone,
    topics,
  })
  if (!input.success) {
    throw new ApiError(400, 'validation', input.error.issues[0]?.message ?? 'Candidate is not valid yet')
  }
  const talent = await createTalent(d1, input.data, actor)

  // History marker: imported from the old system (FR-007)
  const talentRow = await getTalentRow(d1, talent.reference as string)
  await d1
    .prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       VALUES (?, ?, 'field_changed', 'import', NULL, ?, ?)`,
    )
    .bind(talentRow!.id, actor, `Imported from ${row.source_id}`, nowIso())
    .run()

  // Best-effort photo fetch — failure noted as a gap, never blocks approval
  let photoNote: string | null = null
  if (row.photo_url) {
    try {
      const res = await fetch(row.photo_url, { signal: AbortSignal.timeout(10_000) })
      const type = res.headers.get('Content-Type') ?? ''
      if (res.ok && ['image/jpeg', 'image/png', 'image/webp'].includes(type.split(';')[0]!.trim())) {
        const bytes = await res.arrayBuffer()
        if (bytes.byteLength <= 10 * 1024 * 1024) {
          const photoId = crypto.randomUUID().slice(0, 12)
          const key = `talent/${talent.reference}/${photoId}-original`
          await photos.put(key, bytes, { httpMetadata: { contentType: type.split(';')[0]!.trim() } })
          await d1
            .prepare(
              `INSERT INTO talent_photo (id, talent_id, r2_key_original, r2_key_display, content_type, is_primary, sort_order, created_at, created_by)
               VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
            )
            .bind(photoId, talentRow!.id, key, key, type.split(';')[0]!.trim(), nowIso(), actor)
            .run()
        } else photoNote = 'Photo too large to import'
      } else photoNote = 'Photo could not be fetched'
    } catch {
      photoNote = 'Photo could not be fetched'
    }
  }

  const gaps = JSON.parse(row.gaps_json) as string[]
  if (photoNote) gaps.push(photoNote)
  await d1
    .prepare(
      "UPDATE import_candidate SET status = 'imported', talent_reference = ?, gaps_json = ?, decided_at = ?, decided_by = ? WHERE id = ?",
    )
    .bind(talent.reference, JSON.stringify(gaps), nowIso(), actor, id)
    .run()

  return talent.reference as string
}

export async function approveCandidates(d1: D1Database, photos: R2Bucket, ids: number[], actor: string) {
  const results: { id: number; ok: boolean; talent_reference?: string; reason?: string }[] = []
  for (const id of ids) {
    try {
      const reference = await approveOne(d1, photos, id, actor)
      results.push({ id, ok: true, talent_reference: reference })
    } catch (err) {
      results.push({ id, ok: false, reason: err instanceof ApiError ? err.message : 'Something went wrong' })
    }
  }
  return { results }
}

export async function clearStaging(d1: D1Database) {
  const res = await d1.prepare("DELETE FROM import_candidate WHERE status = 'new'").run()
  return { deleted: res.meta.changes ?? 0 }
}
