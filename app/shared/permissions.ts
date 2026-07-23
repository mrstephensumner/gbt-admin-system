/**
 * Permission areas — the single source of authorization vocabulary
 * (constitution Principle V; spec 002 FR-006/007). The API enforces these;
 * the UI imports the same definitions to hide/disable controls. Grants are
 * stored as rows: absence = denied (default-deny, FR-008). The Owner
 * short-circuits every check.
 */
export const PERMISSIONS = ['edit_day_rates', 'publish', 'archive', 'manage_topics', 'import_roster', 'network'] as const

export type Permission = (typeof PERMISSIONS)[number]

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value)
}

/** Sentence-case labels for the Team screen toggles. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  edit_day_rates: 'Edit day rates',
  publish: 'Publish and unpublish',
  archive: 'Archive and restore',
  manage_topics: 'Manage topics',
  import_roster: 'Import roster files',
  network: 'Manage the publishing network',
}

/** Factual refusal messages (FR-012) — used verbatim by the API. */
export const PERMISSION_REFUSALS: Record<Permission, string> = {
  edit_day_rates: "You don't have permission to edit day rates — ask the owner",
  publish: "You don't have permission to publish speakers — ask the owner",
  archive: "You don't have permission to archive speakers — ask the owner",
  manage_topics: "You don't have permission to manage topics — ask the owner",
  import_roster: "You don't have permission to import roster files — ask the owner",
  network: "You don't have permission to manage the network — ask the owner",
}

export const NOT_REGISTERED_MESSAGE = "You don't have access yet — ask the owner to add you"

export type OperatorRole = 'owner' | 'operator'

export interface OperatorView {
  email: string
  role: OperatorRole
  grants: Permission[]
}

/** Owner holds every permission, including future areas (FR-002/008). */
export function can(operator: Pick<OperatorView, 'role' | 'grants'>, permission: Permission): boolean {
  if (operator.role === 'owner') return true
  return operator.grants.includes(permission)
}
