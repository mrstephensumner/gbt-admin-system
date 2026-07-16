import type { Context, Next } from 'hono'
import { NOT_REGISTERED_MESSAGE, PERMISSION_REFUSALS, can, type Permission } from '../../shared/permissions'
import type { OperatorRecord } from '../services/operators'
import { ensureOwner, findOperator } from '../services/operators'
import type { Env } from '../env'
import { ApiError } from './errors'

export type AuthzVariables = { operator: string; operatorRecord: OperatorRecord }

/**
 * Registry gate (spec 002 FR-003, research R1/R6): loads the operator record
 * fresh on every request — no caching, so revocation applies immediately.
 * Runs after identity (which sets the authenticated email).
 */
export async function withAuthorization(
  c: Context<{ Bindings: Env; Variables: AuthzVariables }>,
  next: Next,
) {
  await ensureOwner(c.env.DB, c.env.OWNER_EMAIL)
  const record = await findOperator(c.env.DB, c.get('operator'))
  if (!record) {
    throw new ApiError(403, 'not_registered', NOT_REGISTERED_MESSAGE)
  }
  c.set('operatorRecord', record)
  return next()
}

/** Route guard: declare the permission an action needs, next to the route. */
export function requirePermission(permission: Permission) {
  return async (c: Context<{ Bindings: Env; Variables: AuthzVariables }>, next: Next) => {
    const record = c.get('operatorRecord')
    if (!can(record, permission)) {
      throw new ApiError(403, 'forbidden', PERMISSION_REFUSALS[permission], { permission })
    }
    return next()
  }
}

/** Owner-only guard for /api/team/*. Operator management is not grantable. */
export async function requireOwner(c: Context<{ Bindings: Env; Variables: AuthzVariables }>, next: Next) {
  if (c.get('operatorRecord').role !== 'owner') {
    throw new ApiError(403, 'forbidden', 'Only the owner can manage the team')
  }
  return next()
}
