import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Sparkles, AlertTriangle, Check } from 'lucide-react'
import { Badge, Button, Card, Textarea, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { useCan } from '../lib/operator'
import type { EnrichmentData, EnrichmentSite, Talent } from '../lib/types'
import { ENRICHMENT_STATE_LABELS } from '@shared/enrichment'
import { formatDateTime } from '@shared/format'

const STATE_TONE = { draft: 'neutral', admin_approved: 'warning', talent_approved: 'info', published: 'success' } as const

export function EnrichmentTab({ talent, reference, onChanged }: { talent: Talent; reference: string; onChanged: () => Promise<void> }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const canAdmin = useCan('publish') // owner auto-holds publish; admin approval gate
  const q = useQuery({ queryKey: ['enrichment', reference], queryFn: () => api.get<EnrichmentData>(`/talent/${reference}/enrichment`) })
  const data = q.data
  const [source, setSource] = useState<string | null>(null)
  const [savingSource, setSavingSource] = useState(false)

  if (!data) return null
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enrichment', reference] }),
      queryClient.invalidateQueries({ queryKey: ['history', reference] }),
      onChanged(),
    ])

  const sourceValue = source ?? data.source_material ?? ''

  async function saveSource() {
    setSavingSource(true)
    try {
      await api.put(`/talent/${reference}/source-material`, { source_material: sourceValue.trim() === '' ? null : sourceValue.trim() })
      await refresh()
      setSource(null)
      toast({ tone: 'success', title: 'Source material saved' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setSavingSource(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {!data.settings_ready && (
        <Card>
          <p className="gb-meta-row">
            The Anthropic API key isn&apos;t configured yet. An owner can set it in{' '}
            <Link to="/settings/enrichment" style={{ color: 'var(--brand-blue, #1E6FD9)' }}>AI enrichment settings</Link> before bios can be generated.
          </p>
        </Card>
      )}
      {!data.master_bio_present && (
        <Card><p className="gb-meta-row">Add a master biography on the Profile tab — the AI grounds every per-site bio on it.</p></Card>
      )}

      <Card title="Grounding source" subtitle="Extra facts the AI may use — achievements, testimonials. It never invents anything beyond the master bio, topics and this.">
        <Textarea value={sourceValue} rows={3} onChange={(e) => setSource(e.target.value)} placeholder="e.g. TEDx speaker 2024; client testimonial from Barclays; MBE 2023" />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="secondary" disabled={savingSource} onClick={() => void saveSource()}>Save source material</Button>
        </div>
      </Card>

      {data.sites.map((site) => (
        <SiteCard key={site.brand_id} site={site} reference={reference} talent={talent} canAdmin={canAdmin} settingsReady={data.settings_ready} masterBio={data.master_bio_present} refresh={refresh} toast={toast} />
      ))}
    </div>
  )
}

function SiteCard({
  site, reference, talent, canAdmin, settingsReady, masterBio, refresh, toast,
}: {
  site: EnrichmentSite
  reference: string
  talent: Talent
  canAdmin: boolean
  settingsReady: boolean
  masterBio: boolean
  refresh: () => Promise<unknown>
  toast: ReturnType<typeof useToast>
}) {
  const bio = site.bio
  const [body, setBody] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const bodyValue = body ?? bio?.body ?? ''

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true)
    try {
      await fn()
      await refresh()
      setBody(null)
      toast({ tone: 'success', title: ok })
    } catch (err) {
      toast({ tone: 'danger', title: 'Action failed', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  const highSimilarity = bio && bio.similarity >= 60

  return (
    <Card
      title={site.brand_name}
      subtitle={site.published_here ? 'This speaker is published here' : 'Not published here yet'}
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {site.incomplete && <Badge tone="warning" dot>Incomplete</Badge>}
          {bio && <Badge tone={STATE_TONE[bio.state]} dot>{ENRICHMENT_STATE_LABELS[bio.state]}</Badge>}
          <Button disabled={busy || !settingsReady || !masterBio} onClick={() => void run(() => api.post(`/talent/${reference}/enrichment/${site.brand_id}/generate`, {}), 'Bio generated')}>
            <Sparkles size={15} /> {bio ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
      }
    >
      {!bio && <p className="gb-meta-row">No bio for this site yet. {site.incomplete ? 'It is falling back to the master bio.' : ''}</p>}
      {bio && (
        <div style={{ display: 'grid', gap: 12 }}>
          <Textarea value={bodyValue} rows={6} disabled={bio.state === 'published'} onChange={(e) => setBody(e.target.value)} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }} className="gb-meta-row">
            <span style={{ fontSize: 12 }}>{bio.word_count} words</span>
            <span style={{ fontSize: 12, color: highSimilarity ? 'var(--brand-red, #C8102E)' : undefined }}>
              {highSimilarity && <AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 3 }} />}
              {bio.similarity}% similar to master{highSimilarity ? ' — differentiate further' : ''}
            </span>
            {bio.model && <span style={{ fontSize: 12 }}>· {bio.model}</span>}
            {bio.banned_hits.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--brand-red, #C8102E)' }}>
                <AlertTriangle size={12} style={{ verticalAlign: -1, marginRight: 3 }} />
                Banned words: {bio.banned_hits.join(', ')}
              </span>
            )}
          </div>
          {(bio.admin_approved_by || bio.talent_approved_by) && (
            <p className="gb-meta-row" style={{ fontSize: 12 }}>
              {bio.admin_approved_by && <>Admin approved by {bio.admin_approved_by}. </>}
              {bio.talent_approved_by && <>Talent approved ({bio.talent_approved_by}). </>}
              {bio.published_at && <>Published {formatDateTime(bio.published_at)}.</>}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {bio.state !== 'published' && body !== null && body.trim() !== '' && (
              <Button variant="secondary" disabled={busy} onClick={() => void run(() => api.patch(`/talent/${reference}/enrichment/${site.brand_id}`, { body: bodyValue }), 'Bio saved')}>Save edit</Button>
            )}
            {bio.state === 'draft' && canAdmin && (
              <Button variant="secondary" disabled={busy} onClick={() => void run(() => api.post(`/talent/${reference}/enrichment/${site.brand_id}/approve`, { by: 'admin' }), 'Admin approved')}>Admin approve</Button>
            )}
            {bio.state === 'admin_approved' && (
              <Button variant="secondary" disabled={busy} onClick={() => {
                const name = window.prompt('Record the talent approval — who approved (talent name)?', talent.name)
                if (name && name.trim()) void run(() => api.post(`/talent/${reference}/enrichment/${site.brand_id}/approve`, { by: 'talent', talent_name: name.trim() }), 'Talent approval recorded')
              }}>Record talent approval</Button>
            )}
            {bio.state !== 'published' && (
              <Button disabled={busy || bio.state !== 'talent_approved'} onClick={() => void run(() => api.post(`/talent/${reference}/enrichment/${site.brand_id}/publish`, {}), 'Bio published')}>
                <Check size={15} /> Publish
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
