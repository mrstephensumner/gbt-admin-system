import { nanoid } from 'nanoid'
import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getStepDef, isAttestationStep } from '../../shared/onboarding'
import { getTalentRow } from './serialize'

/**
 * Talent documents (spec 011 / ADR 0006). Files live in the separate
 * `gbt-documents` R2 bucket, served only through the authenticated Worker.
 * Store-then-record on upload (compensating-delete on failure); delete rows
 * before objects so a record never outlives its file on the read path.
 */

interface UploadInput {
  bytes: ArrayBuffer
  filename: string
  contentType: string
  size: number
  title?: string
  stepKey?: string | null
}

async function requireTalent(d1: D1Database, reference: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  return t
}

function stepLabel(stepKey: string | null): string | null {
  return stepKey ? (getStepDef(stepKey)?.title ?? stepKey) : null
}

export async function listDocuments(d1: D1Database, reference: string) {
  const t = await requireTalent(d1, reference)
  const rows = await d1
    .prepare(
      `SELECT d.id, d.step_key, d.title,
              v.id AS version_id, v.version_no, v.filename, v.content_type, v.size_bytes, v.uploaded_by, v.uploaded_at,
              (SELECT COUNT(*) FROM talent_document_version vv WHERE vv.document_id = d.id) AS version_count
       FROM talent_document d
       JOIN talent_document_version v ON v.document_id = d.id
       WHERE d.talent_id = ?
         AND v.version_no = (SELECT MAX(version_no) FROM talent_document_version w WHERE w.document_id = d.id)
       ORDER BY d.id DESC`,
    )
    .bind(t.id)
    .all<{
      id: number; step_key: string | null; title: string; version_id: number; version_no: number
      filename: string; content_type: string; size_bytes: number; uploaded_by: string; uploaded_at: string; version_count: number
    }>()
  return {
    documents: rows.results.map((r) => ({
      id: r.id,
      step_key: r.step_key,
      step_label: stepLabel(r.step_key),
      title: r.title,
      versionCount: r.version_count,
      current: {
        versionId: r.version_id,
        version_no: r.version_no,
        filename: r.filename,
        content_type: r.content_type,
        size_bytes: r.size_bytes,
        uploaded_by: r.uploaded_by,
        uploaded_at: r.uploaded_at,
      },
    })),
  }
}

export async function uploadDocument(d1: D1Database, r2: R2Bucket, reference: string, input: UploadInput, actor: string) {
  const t = await requireTalent(d1, reference)
  const stepKey = input.stepKey ?? null
  if (stepKey && !isAttestationStep(stepKey))
    throw new ApiError(400, 'bad_step', 'Documents can only be attached to onboarding attestation steps')

  const now = nowIso()
  const title = (input.title?.trim() || input.filename).slice(0, 200)
  const created = await d1
    .prepare('INSERT INTO talent_document (talent_id, step_key, title, created_by, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id')
    .bind(t.id, stepKey, title, actor, now)
    .first<{ id: number }>()
  const documentId = created!.id

  await storeVersion(d1, r2, t.reference, documentId, 1, input, actor, now)
  await d1
    .prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       VALUES (?, ?, 'document_uploaded', ?, NULL, ?, ?)`,
    )
    .bind(t.id, actor, stepLabel(stepKey) ?? 'document', title, now)
    .run()
  return listDocuments(d1, reference)
}

export async function addVersion(d1: D1Database, r2: R2Bucket, reference: string, documentId: number, input: UploadInput, actor: string) {
  const t = await requireTalent(d1, reference)
  const doc = await d1
    .prepare('SELECT id, title FROM talent_document WHERE id = ? AND talent_id = ?')
    .bind(documentId, t.id)
    .first<{ id: number; title: string }>()
  if (!doc) throw new ApiError(404, 'not_found', 'No such document')

  const max = await d1
    .prepare('SELECT COALESCE(MAX(version_no), 0) AS n FROM talent_document_version WHERE document_id = ?')
    .bind(documentId)
    .first<{ n: number }>()
  const now = nowIso()
  await storeVersion(d1, r2, t.reference, documentId, (max?.n ?? 0) + 1, input, actor, now)
  await d1
    .prepare(
      `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
       VALUES (?, ?, 'document_version_added', ?, NULL, ?, ?)`,
    )
    .bind(t.id, actor, 'document', doc.title, now)
    .run()
  return listDocuments(d1, reference)
}

/** Store the object first, then the row; compensating-delete the object if the row write fails (FR-012). */
async function storeVersion(
  d1: D1Database,
  r2: R2Bucket,
  reference: string,
  documentId: number,
  versionNo: number,
  input: UploadInput,
  actor: string,
  now: string,
) {
  const key = `talent/${reference}/${documentId}/${versionNo}-${nanoid(10)}`
  await r2.put(key, input.bytes, { httpMetadata: { contentType: input.contentType } })
  try {
    await d1
      .prepare(
        `INSERT INTO talent_document_version (document_id, version_no, r2_key, filename, content_type, size_bytes, uploaded_by, uploaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(documentId, versionNo, key, input.filename, input.contentType, input.size, actor, now)
      .run()
  } catch (err) {
    await r2.delete(key).catch(() => {})
    throw err
  }
}

export async function versionHistory(d1: D1Database, reference: string, documentId: number) {
  const t = await requireTalent(d1, reference)
  const rows = await d1
    .prepare(
      `SELECT v.id, v.version_no, v.filename, v.content_type, v.size_bytes, v.uploaded_by, v.uploaded_at
       FROM talent_document_version v JOIN talent_document d ON d.id = v.document_id
       WHERE v.document_id = ? AND d.talent_id = ?
       ORDER BY v.version_no DESC`,
    )
    .bind(documentId, t.id)
    .all<{ id: number; version_no: number; filename: string; content_type: string; size_bytes: number; uploaded_by: string; uploaded_at: string }>()
  return {
    versions: rows.results.map((v) => ({
      versionId: v.id,
      version_no: v.version_no,
      filename: v.filename,
      content_type: v.content_type,
      size_bytes: v.size_bytes,
      uploaded_by: v.uploaded_by,
      uploaded_at: v.uploaded_at,
    })),
  }
}

/** Resolve a version's stored object for download (auth applied at the route). */
export async function getVersionFile(d1: D1Database, reference: string, versionId: number) {
  const t = await requireTalent(d1, reference)
  return d1
    .prepare(
      `SELECT v.r2_key, v.filename, v.content_type FROM talent_document_version v
       JOIN talent_document d ON d.id = v.document_id
       WHERE v.id = ? AND d.talent_id = ?`,
    )
    .bind(versionId, t.id)
    .first<{ r2_key: string; filename: string; content_type: string }>()
}

/** Delete the whole document — rows first, then every stored object (FR-007, erasure). */
export async function deleteDocument(d1: D1Database, r2: R2Bucket, reference: string, documentId: number, actor: string) {
  const t = await requireTalent(d1, reference)
  const doc = await d1
    .prepare('SELECT id, title FROM talent_document WHERE id = ? AND talent_id = ?')
    .bind(documentId, t.id)
    .first<{ id: number; title: string }>()
  if (!doc) throw new ApiError(404, 'not_found', 'No such document')

  const versions = await d1
    .prepare('SELECT r2_key FROM talent_document_version WHERE document_id = ?')
    .bind(documentId)
    .all<{ r2_key: string }>()

  const now = nowIso()
  await d1.batch([
    d1.prepare('DELETE FROM talent_document_version WHERE document_id = ?').bind(documentId),
    d1.prepare('DELETE FROM talent_document WHERE id = ?').bind(documentId),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'document_deleted', 'document', ?, NULL, ?)`,
      )
      .bind(t.id, actor, doc.title, now),
  ])
  await Promise.all(versions.results.map((v) => r2.delete(v.r2_key).catch(() => {})))
  return { ok: true }
}
