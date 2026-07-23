import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ArrowLeft, ArrowRight } from 'lucide-react'
import { Badge, Button, Card, Input, Switch, Textarea, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { penceToPounds, poundsToPence } from '../lib/hooks'
import type { OnboardingData, OnboardingStatus, Talent } from '../lib/types'
import { formatDateTime } from '@shared/format'

const STATUS_TONE: Record<OnboardingStatus, 'success' | 'warning' | 'neutral'> = {
  complete: 'success',
  in_progress: 'warning',
  not_started: 'neutral',
  not_applicable: 'neutral',
}
const STATUS_LABEL: Record<OnboardingStatus, string> = {
  complete: 'Complete',
  in_progress: 'In progress',
  not_started: 'Not started',
  not_applicable: 'Not applicable',
}
const DERIVED_HINT: Record<string, string> = {
  headshots: 'This step completes when at least one headshot is added in the Photos tab.',
  biography: 'This step completes when a biography is saved on the Profile tab.',
}

export function OnboardingTab({
  talent,
  reference,
  canEditDayRates,
  onChanged,
}: {
  talent: Talent
  reference: string
  canEditDayRates: boolean
  onChanged: () => Promise<void>
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const onboarding = useQuery({
    queryKey: ['onboarding', reference],
    queryFn: () => api.get<OnboardingData>(`/talent/${reference}/onboarding`),
  })
  const data = onboarding.data
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [fee, setFee] = useState<{ standard: string; half: string; afterDinner: string; travel: string; vary: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  if (!data) return null

  const steps = data.steps
  const selected = steps.find((s) => s.key === selectedKey) ?? steps.find((s) => s.blocksPublish) ?? steps[0]!
  const index = steps.findIndex((s) => s.key === selected.key)
  const blocking = steps.filter((s) => s.blocksPublish)

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['onboarding', reference] }),
      onChanged(),
    ])
  }

  const feeState =
    fee ??
    {
      standard: penceToPounds(data.fee.day_rate_pence),
      half: penceToPounds(data.fee.half_day_rate_pence),
      afterDinner: penceToPounds(data.fee.after_dinner_rate_pence),
      travel: data.fee.travel_terms ?? '',
      vary: data.fee.fees_vary_by_site,
    }

  async function saveStep(status: OnboardingStatus, advance: boolean) {
    setBusy(true)
    try {
      await api.put(`/talent/${reference}/onboarding/${selected.key}`, {
        status,
        note: note.trim() === '' ? null : note.trim(),
        version: talent.version,
      })
      await refresh()
      setNote('')
      toast({ tone: 'success', title: status === 'complete' ? 'Step completed' : status === 'not_applicable' ? 'Step marked not applicable' : 'Draft saved' })
      if (advance && index < steps.length - 1) setSelectedKey(steps[index + 1]!.key)
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save step', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  async function saveFee(advance: boolean) {
    setBusy(true)
    try {
      await api.patch(`/talent/${reference}/fee-schedule`, {
        day_rate_pence: poundsToPence(feeState.standard),
        half_day_rate_pence: poundsToPence(feeState.half),
        after_dinner_rate_pence: poundsToPence(feeState.afterDinner),
        travel_terms: feeState.travel.trim() === '' ? null : feeState.travel.trim(),
        fees_vary_by_site: feeState.vary,
        version: talent.version,
      })
      await refresh()
      setFee(null)
      toast({ tone: 'success', title: 'Fee schedule saved' })
      if (advance && index < steps.length - 1) setSelectedKey(steps[index + 1]!.key)
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save fees', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  const isAttestation = !['headshots', 'biography', 'fee_schedule'].includes(selected.key)
  const publishedSomewhere = talent.publications.some((p) => p.published)

  return (
    <div data-testid="onboarding-tab" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 20, alignItems: 'start' }}>
      {/* Checklist rail */}
      <Card title="Onboarding checklist" subtitle={`${data.progress.complete} of ${data.progress.applicable} complete`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--surface-sunken, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
            <div style={{ width: `${data.progress.percent}%`, height: '100%', background: 'var(--brand-red, #C8102E)', borderRadius: 999 }} />
          </div>
          <strong style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{data.progress.percent}%</strong>
        </div>
        <div style={{ display: 'grid', gap: 4 }}>
          {steps.map((s) => {
            const active = s.key === selected.key
            const done = s.status === 'complete'
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => { setSelectedKey(s.key); setNote(''); setFee(null) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  background: active ? 'var(--surface-raised, rgba(255,255,255,0.06))' : 'transparent',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                    background: done ? 'var(--tone-success, #1f8f4e)' : 'transparent',
                    border: done ? 'none' : '2px solid var(--border, rgba(255,255,255,0.2))',
                    color: '#fff',
                  }}
                >
                  {done ? <Check size={13} strokeWidth={3} /> : s.status === 'not_applicable' ? '–' : null}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: 'var(--text-body)', fontWeight: active ? 600 : 400 }}>{s.title}</span>
                  <span className="gb-meta-row" style={{ fontSize: 12 }}>{s.descriptor}</span>
                </span>
                {s.blocksPublish && <span title="Required to publish" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--brand-red, #C8102E)', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Step detail */}
      <Card
        title={selected.title}
        subtitle={`Step ${index + 1} of ${steps.length}${selected.requiredToPublish ? ' · required to publish' : ''}`}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -44, marginBottom: 16 }}>
          <Badge tone={STATUS_TONE[selected.status]} dot>{STATUS_LABEL[selected.status]}</Badge>
        </div>

        {selected.key === 'fee_schedule' ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <label>
                <span className="gb-field-label">Standard day rate</span>
                <Input value={feeState.standard} disabled={!canEditDayRates} inputMode="numeric"
                  onChange={(e) => setFee({ ...feeState, standard: e.target.value })} placeholder="£0" />
                <span className="gb-meta-row" style={{ fontSize: 12 }}>Excludes VAT</span>
              </label>
              <label>
                <span className="gb-field-label">Half-day rate</span>
                <Input value={feeState.half} disabled={!canEditDayRates} inputMode="numeric"
                  onChange={(e) => setFee({ ...feeState, half: e.target.value })} placeholder="£0" />
              </label>
              <label>
                <span className="gb-field-label">After-dinner rate</span>
                <Input value={feeState.afterDinner} disabled={!canEditDayRates} inputMode="numeric"
                  onChange={(e) => setFee({ ...feeState, afterDinner: e.target.value })} placeholder="£0" />
              </label>
              <label>
                <span className="gb-field-label">Travel terms</span>
                <Input value={feeState.travel} disabled={!canEditDayRates}
                  onChange={(e) => setFee({ ...feeState, travel: e.target.value })} placeholder="e.g. Billed at cost" />
              </label>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 8, background: 'var(--surface-raised, rgba(255,255,255,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span>
                <span style={{ display: 'block', color: 'var(--text-body)' }}>Fees vary by site</span>
                <span className="gb-meta-row" style={{ fontSize: 12 }}>Let each brand set its own rate in Profile Enrichment</span>
              </span>
              <Switch checked={feeState.vary} disabled={!canEditDayRates} onChange={(v) => setFee({ ...feeState, vary: v })} />
            </div>
            {!canEditDayRates && <p className="gb-meta-row">You don&apos;t have permission to edit day rates — ask the owner.</p>}
          </div>
        ) : isAttestation ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <p className="gb-meta-row">Record that this check has been completed. Do not enter document numbers here — this is an internal attestation only.</p>
            <label>
              <span className="gb-field-label">Internal note (optional)</span>
              <Textarea value={note} rows={3} onChange={(e) => setNote(e.target.value)}
                placeholder={selected.note ?? 'e.g. Verified against passport, held in file'} />
            </label>
            {selected.actor && selected.at && (
              <p className="gb-meta-row">Last updated {formatDateTime(selected.at)} by {selected.actor}{selected.note ? ` — “${selected.note}”` : ''}</p>
            )}
          </div>
        ) : (
          <p className="gb-meta-row">{DERIVED_HINT[selected.key] ?? 'This step reflects data held elsewhere on the record.'}</p>
        )}

        {selected.blocksPublish && (
          <p style={{ marginTop: 16, color: 'var(--brand-red, #C8102E)' }}>This step is required before {talent.name} can be published.</p>
        )}
        {publishedSomewhere && selected.requiredToPublish && selected.key === 'fee_schedule' && (
          <p className="gb-meta-row" style={{ marginTop: 8 }}>This speaker is published. Clearing the day rate would take them below the publish requirements.</p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 24 }}>
          <Button variant="secondary" disabled={index === 0} onClick={() => setSelectedKey(steps[index - 1]!.key)}>
            <ArrowLeft size={15} /> Previous
          </Button>
          {selected.key === 'fee_schedule' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" disabled={!canEditDayRates || busy} onClick={() => void saveFee(false)}>Save draft</Button>
              <Button disabled={!canEditDayRates || busy} onClick={() => void saveFee(true)}>Save &amp; continue <ArrowRight size={15} /></Button>
            </div>
          ) : isAttestation ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {selected.status === 'complete' ? (
                <Button variant="secondary" disabled={busy} onClick={() => void saveStep('in_progress', false)}>Reopen</Button>
              ) : (
                <Button variant="secondary" disabled={busy} onClick={() => void saveStep('in_progress', false)}>Save draft</Button>
              )}
              {!selected.requiredToPublish && (
                <Button variant="secondary" disabled={busy} onClick={() => void saveStep('not_applicable', false)}>Not applicable</Button>
              )}
              <Button disabled={busy} onClick={() => void saveStep('complete', true)}>Mark verified <ArrowRight size={15} /></Button>
            </div>
          ) : (
            <Button variant="secondary" disabled={index >= steps.length - 1} onClick={() => setSelectedKey(steps[index + 1]!.key)}>
              Next <ArrowRight size={15} />
            </Button>
          )}
        </div>

        {blocking.length > 0 && (
          <p className="gb-meta-row" style={{ marginTop: 20, borderTop: '1px solid var(--border, rgba(255,255,255,0.1))', paddingTop: 16 }}>
            Blocking publication: {blocking.map((s) => s.title).join(', ')}.
          </p>
        )}
      </Card>
    </div>
  )
}
