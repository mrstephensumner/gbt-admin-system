/**
 * Onboarding vocabulary (spec 010). The seven steps are a FIXED, ordered set
 * defined here in code (Constitution V — fixed vocabularies live in code, not
 * data). The checklist is the legible surface of the existing publish gate:
 * `publishBlockers` is the single source both the publish action and the
 * checklist read, so they can never diverge (FR-006).
 */

export const ONBOARDING_STATUSES = ['not_started', 'in_progress', 'complete', 'not_applicable'] as const
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]

/** How a step's completion is determined. */
export type CompletionKind = 'attestation' | 'derived'

export interface OnboardingStepDef {
  key: string
  title: string
  descriptor: string
  order: number
  requiredToPublish: boolean
  completion: CompletionKind
}

export const ONBOARDING_STEPS: readonly OnboardingStepDef[] = [
  { key: 'rep_agreement', title: 'Representation agreement', descriptor: 'Signed & countersigned', order: 1, requiredToPublish: false, completion: 'attestation' },
  { key: 'identity', title: 'Identity & right to work', descriptor: 'Passport verified', order: 2, requiredToPublish: false, completion: 'attestation' },
  { key: 'bank_details', title: 'Bank & payment details', descriptor: 'For fee remittance', order: 3, requiredToPublish: false, completion: 'attestation' },
  { key: 'headshots', title: 'Headshots & showreel', descriptor: 'Min. 3 hi-res images', order: 4, requiredToPublish: true, completion: 'derived' },
  { key: 'biography', title: 'Biography & topics', descriptor: 'Long + short bio', order: 5, requiredToPublish: true, completion: 'derived' },
  { key: 'fee_schedule', title: 'Fee schedule', descriptor: 'Day rate & travel terms', order: 6, requiredToPublish: true, completion: 'derived' },
  { key: 'safeguarding', title: 'Safeguarding & compliance', descriptor: 'DBS where required', order: 7, requiredToPublish: false, completion: 'attestation' },
] as const

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length

export function getStepDef(key: string): OnboardingStepDef | undefined {
  return ONBOARDING_STEPS.find((s) => s.key === key)
}

export function isAttestationStep(key: string): boolean {
  return getStepDef(key)?.completion === 'attestation'
}

/**
 * The unmet publish-required checks for a talent. Identical logic AND order to
 * the historical inline gate in publication.ts — extracted so the publish action
 * and the onboarding checklist read one source (FR-006). Order (day_rate →
 * biography → photo) determines which message the gate shows first, so it is
 * preserved exactly.
 */
export function publishBlockers(
  talent: { day_rate_pence: number | null; biography: string | null },
  photoCount: number,
): Array<'photo' | 'biography' | 'day_rate'> {
  const missing: Array<'photo' | 'biography' | 'day_rate'> = []
  if (!talent.day_rate_pence || talent.day_rate_pence <= 0) missing.push('day_rate')
  if (!talent.biography || talent.biography.trim() === '') missing.push('biography')
  if (photoCount === 0) missing.push('photo')
  return missing
}

/** Map a publish-required step key to the blocker token it depends on. */
export const STEP_BLOCKER: Record<string, 'photo' | 'biography' | 'day_rate'> = {
  headshots: 'photo',
  biography: 'biography',
  fee_schedule: 'day_rate',
}

/** Progress summary from a set of resolved step statuses (not-applicable excluded). */
export function computeProgress(statuses: OnboardingStatus[]): { complete: number; applicable: number; percent: number } {
  const applicableStatuses = statuses.filter((s) => s !== 'not_applicable')
  const applicable = applicableStatuses.length
  const complete = applicableStatuses.filter((s) => s === 'complete').length
  const percent = applicable === 0 ? 0 : Math.round((complete / applicable) * 100)
  return { complete, applicable, percent }
}
