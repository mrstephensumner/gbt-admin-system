import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import {
  ONBOARDING_STEPS,
  STEP_BLOCKER,
  computeProgress,
  getStepDef,
  isAttestationStep,
  type OnboardingStatus,
} from '../../shared/onboarding'
import { getTalentRow, serializeTalent, type TalentRow } from './serialize'

/**
 * Onboarding checklist (spec 010). Derived steps (headshots, biography, fee
 * schedule) compute their status from existing data; attestation steps read
 * stored rows in talent_onboarding_step. All onboarding data is internal-only
 * and never enters serializeTalent's publish-safe output (FR-014).
 */

interface StoredStep {
  step_key: string
  status: OnboardingStatus
  note: string | null
  actor: string
  at: string
}

export interface OnboardingStepView {
  key: string
  title: string
  descriptor: string
  order: number
  requiredToPublish: boolean
  status: OnboardingStatus
  blocksPublish: boolean
  note?: string | null
  actor?: string
  at?: string
}

async function loadContext(d1: D1Database, reference: string) {
  const talent = await getTalentRow(d1, reference)
  if (!talent) throw new ApiError(404, 'not_found', 'No such talent record')
  const [photo, stored] = await Promise.all([
    d1.prepare('SELECT COUNT(*) AS n FROM talent_photo WHERE talent_id = ?').bind(talent.id).first<{ n: number }>(),
    d1
      .prepare('SELECT step_key, status, note, actor, at FROM talent_onboarding_step WHERE talent_id = ?')
      .bind(talent.id)
      .all<StoredStep>(),
  ])
  const photoCount = photo?.n ?? 0
  const byKey = new Map(stored.results.map((r) => [r.step_key, r]))
  return { talent, photoCount, byKey }
}

/** Resolve a single step's status: derived from data, or read from storage. */
function resolveStatus(
  key: string,
  talent: TalentRow,
  photoCount: number,
  stored: StoredStep | undefined,
): OnboardingStatus {
  const def = getStepDef(key)!
  if (def.completion === 'derived') {
    if (key === 'headshots') return photoCount > 0 ? 'complete' : 'not_started'
    if (key === 'biography') return talent.biography && talent.biography.trim() !== '' ? 'complete' : 'not_started'
    if (key === 'fee_schedule') return talent.day_rate_pence && talent.day_rate_pence > 0 ? 'complete' : 'not_started'
  }
  return stored?.status ?? 'not_started'
}

function buildView(talent: TalentRow, photoCount: number, byKey: Map<string, StoredStep>) {
  const steps: OnboardingStepView[] = ONBOARDING_STEPS.map((def) => {
    const stored = byKey.get(def.key)
    const status = resolveStatus(def.key, talent, photoCount, stored)
    return {
      key: def.key,
      title: def.title,
      descriptor: def.descriptor,
      order: def.order,
      requiredToPublish: def.requiredToPublish,
      status,
      blocksPublish: def.requiredToPublish && status !== 'complete',
      ...(def.completion === 'attestation' && stored
        ? { note: stored.note, actor: stored.actor, at: stored.at }
        : {}),
    }
  })
  const progress = computeProgress(steps.map((s) => s.status))
  return {
    steps,
    progress,
    fee: {
      day_rate_pence: talent.day_rate_pence,
      half_day_rate_pence: talent.half_day_rate_pence,
      after_dinner_rate_pence: talent.after_dinner_rate_pence,
      travel_terms: talent.travel_terms,
      fees_vary_by_site: !!talent.fees_vary_by_site,
    },
  }
}

export async function getOnboarding(d1: D1Database, reference: string) {
  const { talent, photoCount, byKey } = await loadContext(d1, reference)
  return buildView(talent, photoCount, byKey)
}

/** Set an attestation step's status (FR-004/013/015). Writes a change record. */
export async function updateStep(
  d1: D1Database,
  reference: string,
  stepKey: string,
  input: { status: OnboardingStatus; note?: string | null; version: number },
  actor: string,
) {
  const def = getStepDef(stepKey)
  if (!def) throw new ApiError(404, 'not_found', 'No such onboarding step')
  if (!isAttestationStep(stepKey)) {
    const blocker = STEP_BLOCKER[stepKey]
    const where =
      blocker === 'photo' ? 'the Photos tab' : blocker === 'biography' ? 'the Profile tab' : 'the Fee schedule step'
    throw new ApiError(400, 'bad_step', `This step completes automatically from ${where}`)
  }
  if (input.status === 'not_applicable' && def.requiredToPublish)
    throw new ApiError(400, 'bad_status', 'A publish-required step cannot be marked not applicable')
  if (!['in_progress', 'complete', 'not_applicable'].includes(input.status))
    throw new ApiError(400, 'bad_status', 'Choose a valid status for this step')

  const talent = await getTalentRow(d1, reference)
  if (!talent) throw new ApiError(404, 'not_found', 'No such talent record')
  if (input.version !== talent.version)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, talent),
    })

  const now = nowIso()
  const newVersion = talent.version + 1
  const action =
    input.status === 'complete'
      ? 'onboarding_step_completed'
      : input.status === 'not_applicable'
        ? 'onboarding_step_na'
        : 'onboarding_step_reverted'

  const results = await d1.batch([
    d1
      .prepare('UPDATE talent SET version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?')
      .bind(newVersion, now, actor, talent.id, talent.version),
    d1
      .prepare(
        `INSERT INTO talent_onboarding_step (talent_id, step_key, status, note, actor, at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(talent_id, step_key) DO UPDATE SET status = excluded.status, note = excluded.note, actor = excluded.actor, at = excluded.at`,
      )
      .bind(talent.id, stepKey, input.status, input.note ?? null, actor, now),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         SELECT id, ?, ?, ?, NULL, ?, ? FROM talent WHERE id = ? AND version = ?`,
      )
      .bind(actor, action, stepKey, def.title, now, talent.id, newVersion),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, (await getTalentRow(d1, reference))!),
    })
  return getOnboarding(d1, reference)
}

const FEE_FIELDS = ['day_rate_pence', 'half_day_rate_pence', 'after_dinner_rate_pence', 'travel_terms', 'fees_vary_by_site'] as const

export interface FeeInput {
  day_rate_pence?: number | null
  half_day_rate_pence?: number | null
  after_dinner_rate_pence?: number | null
  travel_terms?: string | null
  fees_vary_by_site?: boolean
  version: number
}

/** Update the fee schedule (FR-010/011). Requires edit_day_rates (enforced at the route). */
export async function updateFeeSchedule(d1: D1Database, reference: string, input: FeeInput, actor: string) {
  const talent = await getTalentRow(d1, reference)
  if (!talent) throw new ApiError(404, 'not_found', 'No such talent record')
  if (input.version !== talent.version)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, talent),
    })

  for (const key of ['day_rate_pence', 'half_day_rate_pence', 'after_dinner_rate_pence'] as const) {
    const v = input[key]
    if (v !== undefined && v !== null && (!Number.isInteger(v) || v < 0))
      throw new ApiError(422, 'bad_amount', 'Fees must be whole amounts of £0 or more')
  }

  const sets: string[] = []
  const vals: unknown[] = []
  const changed: string[] = []
  for (const f of FEE_FIELDS) {
    if (input[f] === undefined) continue
    if (f === 'fees_vary_by_site') {
      sets.push('fees_vary_by_site = ?')
      vals.push(input.fees_vary_by_site ? 1 : 0)
    } else {
      sets.push(`${f} = ?`)
      vals.push(input[f] ?? null)
    }
    changed.push(f)
  }
  if (sets.length === 0) return getOnboarding(d1, reference)

  const now = nowIso()
  const newVersion = talent.version + 1
  const results = await d1.batch([
    d1
      .prepare(`UPDATE talent SET ${sets.join(', ')}, version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?`)
      .bind(...vals, newVersion, now, actor, talent.id, talent.version),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         SELECT id, ?, 'fee_updated', ?, NULL, NULL, ? FROM talent WHERE id = ? AND version = ?`,
      )
      .bind(actor, changed.join(', '), now, talent.id, newVersion),
  ])
  if ((results[0]?.meta.changes ?? 0) === 0)
    throw new ApiError(409, 'version_conflict', 'This record changed while you were editing', {
      current: await serializeTalent(d1, (await getTalentRow(d1, reference))!),
    })
  return getOnboarding(d1, reference)
}
