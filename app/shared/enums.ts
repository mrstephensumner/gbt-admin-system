/**
 * Fixed status vocabulary (constitution: Operational, Not Promotional).
 * These five values are the only talent statuses that exist anywhere in the
 * system — API, database CHECK constraint, and UI all derive from this module.
 */
export const TALENT_STATUSES = ['available', 'on_hold', 'booked', 'confirmed', 'cancelled'] as const

export type TalentStatus = (typeof TALENT_STATUSES)[number]

export function isTalentStatus(value: unknown): value is TalentStatus {
  return typeof value === 'string' && (TALENT_STATUSES as readonly string[]).includes(value)
}

/** Operator-facing labels — sentence case, per Brand & Content Standards. */
export const TALENT_STATUS_LABELS: Record<TalentStatus, string> = {
  available: 'Available',
  on_hold: 'On hold',
  booked: 'Booked',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
}

/** Badge tones map 1:1 to statuses (design system: green available, blue booked, amber on-hold, red cancelled). */
export type BadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral'

export const TALENT_STATUS_TONES: Record<TalentStatus, BadgeTone> = {
  available: 'success',
  on_hold: 'warning',
  booked: 'info',
  confirmed: 'info',
  cancelled: 'danger',
}

export const DEFAULT_TALENT_STATUS: TalentStatus = 'available'

/** Change-history actions (append-only audit vocabulary — FR-004). */
export const CHANGE_ACTIONS = [
  'created',
  'field_changed',
  'status_changed',
  'published',
  'unpublished',
  'archived',
  'restored',
  'photo_added',
  'photo_removed',
  'topic_merged',
  'note_added',
  'social_link_added',
  'social_link_removed',
  'press_mention_added',
  'press_mention_removed',
  'showreel_added',
  'showreel_removed',
  'seo_updated',
] as const

export type ChangeAction = (typeof CHANGE_ACTIONS)[number]
