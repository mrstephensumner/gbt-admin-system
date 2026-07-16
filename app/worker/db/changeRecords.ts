import type { ChangeAction } from '../../shared/enums'

/**
 * Append-only change history (FR-004, research R9).
 *
 * D1 has no interactive transactions; multi-statement atomicity is achieved
 * with `D1Database.batch()`. Mutations therefore BUILD their change-record
 * statements with `changeStatement` and execute them in the same batch as the
 * mutation itself — attribution is complete by construction. There is no
 * update or delete path for change records anywhere in the codebase.
 */
export interface ChangeEntry {
  talentId: number
  actor: string
  action: ChangeAction
  field?: string | null
  oldValue?: string | null
  newValue?: string | null
  at: string
}

export function changeStatement(d1: D1Database, e: ChangeEntry): D1PreparedStatement {
  return d1
    .prepare(
      'INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(e.talentId, e.actor, e.action, e.field ?? null, e.oldValue ?? null, e.newValue ?? null, e.at)
}
