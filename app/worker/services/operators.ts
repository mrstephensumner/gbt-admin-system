import { PERMISSIONS, type OperatorView, type Permission } from '../../shared/permissions'
import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'

/**
 * Operator registry (spec 002). Invariants enforced here and tested:
 * exactly one owner; owner cannot be removed, demoted, or grant-edited;
 * every management mutation writes its operator_audit row in the same
 * D1 batch (FR-005/009/010, research R7).
 */

export interface OperatorRecord extends OperatorView {
  id: number
  added_at: string
  added_by: string
}

interface OperatorRow {
  id: number
  email: string
  role: 'owner' | 'operator'
  added_at: string
  added_by: string
}

async function grantsFor(d1: D1Database, operatorId: number, role: 'owner' | 'operator'): Promise<Permission[]> {
  if (role === 'owner') return [...PERMISSIONS] // owner reports every area, for UI simplicity
  const rows = await d1
    .prepare('SELECT permission FROM operator_grant WHERE operator_id = ?')
    .bind(operatorId)
    .all<{ permission: Permission }>()
  return rows.results.map((r) => r.permission)
}

async function toRecord(d1: D1Database, row: OperatorRow): Promise<OperatorRecord> {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    grants: await grantsFor(d1, row.id, row.role),
    added_at: row.added_at,
    added_by: row.added_by,
  }
}

export async function findOperator(d1: D1Database, email: string): Promise<OperatorRecord | null> {
  const row = await d1
    .prepare('SELECT * FROM operator WHERE email = ? COLLATE NOCASE')
    .bind(email)
    .first<OperatorRow>()
  return row ? toRecord(d1, row) : null
}

/**
 * Idempotent owner bootstrap (research R4): if the registry has no owner,
 * register OWNER_EMAIL as owner. Refuses loudly when unconfigured — an empty
 * registry with no OWNER_EMAIL would otherwise lock everyone out silently.
 */
export async function ensureOwner(d1: D1Database, ownerEmail: string): Promise<void> {
  const owner = await d1.prepare("SELECT id FROM operator WHERE role = 'owner'").first()
  if (owner) return
  if (!ownerEmail) {
    throw new ApiError(500, 'owner_unconfigured', 'The system owner is not configured — set OWNER_EMAIL')
  }
  const now = nowIso()
  await d1.batch([
    d1
      .prepare("INSERT INTO operator (email, role, added_at, added_by) VALUES (?, 'owner', ?, 'system')")
      .bind(ownerEmail, now),
    d1
      .prepare(
        "INSERT INTO operator_audit (actor, subject_email, action, detail, at) VALUES ('system', ?, 'owner_bootstrapped', NULL, ?)",
      )
      .bind(ownerEmail, now),
  ])
}

export async function listOperators(d1: D1Database): Promise<OperatorRecord[]> {
  const rows = await d1
    .prepare("SELECT * FROM operator ORDER BY role = 'owner' DESC, email COLLATE NOCASE")
    .all<OperatorRow>()
  return Promise.all(rows.results.map((r) => toRecord(d1, r)))
}

/** Idempotent on a case-insensitive match (FR-011). Returns [record, created]. */
export async function addOperator(d1: D1Database, email: string, actor: string): Promise<[OperatorRecord, boolean]> {
  const existing = await findOperator(d1, email)
  if (existing) return [existing, false]
  const now = nowIso()
  await d1.batch([
    d1
      .prepare("INSERT INTO operator (email, role, added_at, added_by) VALUES (?, 'operator', ?, ?)")
      .bind(email, now, actor),
    d1
      .prepare(
        "INSERT INTO operator_audit (actor, subject_email, action, detail, at) VALUES (?, ?, 'operator_added', NULL, ?)",
      )
      .bind(actor, email, now),
  ])
  return [(await findOperator(d1, email))!, true]
}

export async function removeOperator(d1: D1Database, id: number, actor: string): Promise<void> {
  const row = await d1.prepare('SELECT * FROM operator WHERE id = ?').bind(id).first<OperatorRow>()
  if (!row) throw new ApiError(404, 'not_found', 'No such operator')
  if (row.role === 'owner') throw new ApiError(422, 'owner_invariant', 'The owner cannot be removed')
  const now = nowIso()
  // History (change_record) is untouched — attribution is permanent (FR-009)
  await d1.batch([
    d1.prepare('DELETE FROM operator_grant WHERE operator_id = ?').bind(id),
    d1.prepare('DELETE FROM operator WHERE id = ?').bind(id),
    d1
      .prepare(
        "INSERT INTO operator_audit (actor, subject_email, action, detail, at) VALUES (?, ?, 'operator_removed', NULL, ?)",
      )
      .bind(actor, row.email, now),
  ])
}

/** Replace the full grant set; the diff produces one audit row per change. */
export async function replaceGrants(
  d1: D1Database,
  id: number,
  desired: Permission[],
  actor: string,
): Promise<OperatorRecord> {
  const row = await d1.prepare('SELECT * FROM operator WHERE id = ?').bind(id).first<OperatorRow>()
  if (!row) throw new ApiError(404, 'not_found', 'No such operator')
  if (row.role === 'owner')
    throw new ApiError(422, 'owner_invariant', "The owner's permissions cannot be changed")

  const current = await grantsFor(d1, row.id, row.role)
  const toGrant = desired.filter((p) => !current.includes(p))
  const toRevoke = current.filter((p) => !desired.includes(p))
  if (toGrant.length === 0 && toRevoke.length === 0) return toRecord(d1, row)

  const now = nowIso()
  await d1.batch([
    ...toGrant.map((p) =>
      d1
        .prepare('INSERT INTO operator_grant (operator_id, permission, granted_at, granted_by) VALUES (?, ?, ?, ?)')
        .bind(row.id, p, now, actor),
    ),
    ...toRevoke.map((p) =>
      d1.prepare('DELETE FROM operator_grant WHERE operator_id = ? AND permission = ?').bind(row.id, p),
    ),
    ...toGrant.map((p) =>
      d1
        .prepare(
          "INSERT INTO operator_audit (actor, subject_email, action, detail, at) VALUES (?, ?, 'permission_granted', ?, ?)",
        )
        .bind(actor, row.email, p, now),
    ),
    ...toRevoke.map((p) =>
      d1
        .prepare(
          "INSERT INTO operator_audit (actor, subject_email, action, detail, at) VALUES (?, ?, 'permission_revoked', ?, ?)",
        )
        .bind(actor, row.email, p, now),
    ),
  ])
  return toRecord(d1, (await d1.prepare('SELECT * FROM operator WHERE id = ?').bind(id).first<OperatorRow>())!)
}

export async function listAudit(d1: D1Database, page: number, perPage: number) {
  const [rows, count] = await Promise.all([
    d1
      .prepare('SELECT * FROM operator_audit ORDER BY id DESC LIMIT ? OFFSET ?')
      .bind(perPage, (page - 1) * perPage)
      .all(),
    d1.prepare('SELECT COUNT(*) AS n FROM operator_audit').first<{ n: number }>(),
  ])
  return { items: rows.results, total: count!.n, page, per_page: perPage }
}
