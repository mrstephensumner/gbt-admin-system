import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Link2, Trash2 } from 'lucide-react'
import { Avatar, Badge, Button, Card, Dialog, IconButton, Input, Select, Switch, Tabs, Textarea, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { penceToPounds, poundsToPence } from '../lib/hooks'
import { useCan } from '../lib/operator'
import type { ChangeRecordItem, DocumentsData, Talent } from '../lib/types'
import { TALENT_STATUSES, TALENT_STATUS_LABELS, TALENT_STATUS_TONES } from '@shared/enums'
import type { TalentStatus } from '@shared/enums'
import { formatDate, formatDateTime, formatDayRate } from '@shared/format'
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS, formatFollowers, type SocialPlatform } from '@shared/social'
import { TalentFields, validateTalentForm, type TalentFormValues } from './talent-form'
import { EnrichmentTab } from './enrichment-tab'
import { MediaTab } from './media-tab'
import { OnboardingTab } from './onboarding-tab'
import { DocumentsPanel } from './documents-panel'
import { AvailabilityTab } from './availability-tab'

function toFormValues(t: Talent): TalentFormValues {
  return {
    name: t.name,
    headline: t.headline ?? '',
    biography: t.biography ?? '',
    dayRatePounds: penceToPounds(t.day_rate_pence),
    location: t.location ?? '',
    email: t.email ?? '',
    phone: t.phone ?? '',
    topics: t.topics.map((topic) => topic.id),
  }
}

export function TalentProfileScreen() {
  const { reference = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const canPublish = useCan('publish')
  const canArchive = useCan('archive')
  const canEditDayRates = useCan('edit_day_rates')

  const talentQuery = useQuery({
    queryKey: ['talent', reference],
    queryFn: () => api.get<Talent>(`/talent/${reference}`),
  })
  const historyQuery = useQuery({
    queryKey: ['history', reference],
    queryFn: () => api.get<{ items: ChangeRecordItem[]; total: number }>(`/talent/${reference}/history?per_page=50`),
  })

  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'profile'
  const setTab = (value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'profile') next.delete('tab')
    else next.set('tab', value)
    setParams(next, { replace: true })
  }
  const statsQuery = useQuery({
    queryKey: ['stats', reference],
    queryFn: () => api.get<TalentStatsData>(`/talent/${reference}/stats`),
    enabled: tab === 'stats',
  })
  const socialQuery = useQuery({
    queryKey: ['social', reference],
    queryFn: () => api.get<SocialData>(`/talent/${reference}/social`),
    enabled: tab === 'social',
  })
  const notesQuery = useQuery({
    queryKey: ['notes', reference],
    queryFn: () => api.get<{ items: TalentNote[]; total: number }>(`/talent/${reference}/notes?per_page=50`),
  })
  const documentsQuery = useQuery({
    queryKey: ['documents', reference],
    queryFn: () => api.get<DocumentsData>(`/talent/${reference}/documents`),
  })

  const talent = talentQuery.data
  const [values, setValues] = useState<TalentFormValues | null>(null)
  const [errors, setErrors] = useState<ReturnType<typeof validateTalentForm>>({})
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<Talent | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)

  // Render-phase state adjustment (react.dev "adjusting state when a prop
  // changes"): hydrate the form once the record arrives or after a reset.
  if (talent && values === null) setValues(toFormValues(talent))

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['talent', reference] }),
      queryClient.invalidateQueries({ queryKey: ['history', reference] }),
      queryClient.invalidateQueries({ queryKey: ['directory'] }),
    ])
  }

  /** Shared mutation wrapper: surfaces 409s with the reload flow (FR-016). */
  const mutate = async (fn: () => Promise<Talent>, successTitle: string) => {
    try {
      await fn()
      await refresh()
      toast({ tone: 'success', title: successTitle })
      return true
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setConflict((err.body.current as Talent) ?? null)
      } else {
        const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
        toast({ tone: 'danger', title: 'Could not save', message })
      }
      return false
    }
  }

  if (talentQuery.isLoading) return <p>Loading…</p>
  if (!talent || !values) return <p className="gb-empty">No such talent record.</p>

  const save = async () => {
    const nextErrors = validateTalentForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setSaving(true)
    await mutate(
      () =>
        api.patch<Talent>(`/talent/${reference}`, {
          version: talent.version,
          name: values.name.trim(),
          headline: values.headline.trim() || null,
          biography: values.biography.trim() || null,
          day_rate_pence: poundsToPence(values.dayRatePounds),
          location: values.location.trim() || null,
          email: values.email.trim() || null,
          phone: values.phone.trim() || null,
          topics: values.topics,
        }),
      'Changes saved',
    )
    setSaving(false)
  }

  const primaryPhoto = talent.photos.find((p) => p.is_primary) ?? talent.photos[0]

  return (
    <div>
      <div className="gb-page-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <IconButton label="Back to speakers" onClick={() => navigate('/speakers')}>
            <ArrowLeft size={18} />
          </IconButton>
          <Avatar src={primaryPhoto?.url} name={talent.name} size={48} />
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {talent.name}
              <Badge tone={TALENT_STATUS_TONES[talent.status]} dot>
                {TALENT_STATUS_LABELS[talent.status]}
              </Badge>
              {talent.archived && <Badge tone="neutral">Archived</Badge>}
            </h1>
            <div className="gb-ref" data-testid="talent-reference">
              {talent.reference}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!talent.archived && (
            <div style={{ width: 160 }}>
              <Select
                aria-label="Status"
                value={talent.status}
                onChange={(e) =>
                  void mutate(
                    () => api.post<Talent>(`/talent/${reference}/status`, { status: e.target.value, version: talent.version }),
                    'Status updated',
                  )
                }
                options={TALENT_STATUSES.map((s) => ({ value: s, label: TALENT_STATUS_LABELS[s] }))}
              />
            </div>
          )}
          {talent.archived ? (
            canArchive && (
            <Button
              variant="secondary"
              onClick={() =>
                void mutate(
                  () => api.post<Talent>(`/talent/${reference}/restore`, { version: talent.version }),
                  'Speaker restored',
                )
              }
            >
              Restore speaker
            </Button>
            )
          ) : (
            canArchive && (
              <Button variant="danger" onClick={() => setArchiveOpen(true)}>
                Archive speaker
              </Button>
            )
          )}
        </div>
      </div>

      {/* Workspace tabs (spec 005 FR-001) — deep-linkable via ?tab= */}
      <Tabs
        tabs={[
          { value: 'profile', label: 'Profile' },
          { value: 'photos', label: 'Photos' },
          { value: 'notes', label: 'Notes', count: notesQuery.data?.total },
          { value: 'onboarding', label: 'Onboarding' },
          { value: 'documents', label: 'Documents', count: documentsQuery.data?.documents.length },
          { value: 'availability', label: 'Availability' },
          { value: 'social', label: 'Social & News' },
          { value: 'enrichment', label: 'Profile Enrichment' },
          { value: 'stats', label: 'Statistics' },
          { value: 'site', label: 'Network' },
          { value: 'history', label: 'History' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div style={{ marginTop: 20 }}>
        {tab === 'profile' && (
          <Card title="Profile" subtitle={`Last updated ${formatDateTime(talent.updated_at)} by ${talent.updated_by}`}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <TalentFields values={values} onChange={setValues} errors={errors} dayRateReadOnly={!canEditDayRates} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <Button variant="secondary" onClick={() => setValues(toFormValues(talent))}>
                  Reset
                </Button>
                <Button type="submit" disabled={saving || talent.archived}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>
        )}

        {tab === 'photos' && (
          <MediaTab talent={talent} reference={reference} onPhotosChanged={refresh} />
        )}

        {tab === 'notes' && (
          <NotesTab
            notes={notesQuery.data?.items ?? []}
            onAdd={async (noteBody) => {
              try {
                await api.post(`/talent/${reference}/notes`, { body: noteBody })
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['notes', reference] }),
                  queryClient.invalidateQueries({ queryKey: ['history', reference] }),
                  queryClient.invalidateQueries({ queryKey: ['stats', reference] }),
                ])
                toast({ tone: 'success', title: 'Note added' })
                return true
              } catch (err) {
                const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
                toast({ tone: 'danger', title: 'Could not add note', message })
                return false
              }
            }}
          />
        )}

        {tab === 'onboarding' && (
          <OnboardingTab talent={talent} reference={reference} canEditDayRates={canEditDayRates} onChanged={refresh} />
        )}
        {tab === 'documents' && (
          <DocumentsPanel reference={reference} title="Documents" subtitle="Agreements, riders and other files held for this speaker — internal only" />
        )}
        {tab === 'availability' && <AvailabilityTab reference={reference} />}
        {tab === 'social' && (
          <SocialTab
            data={socialQuery.data}
            onChanged={async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['social', reference] }),
                queryClient.invalidateQueries({ queryKey: ['history', reference] }),
                queryClient.invalidateQueries({ queryKey: ['stats', reference] }),
              ])
            }}
            reference={reference}
            toast={toast}
          />
        )}
        {tab === 'enrichment' && <EnrichmentTab talent={talent} reference={reference} onChanged={refresh} />}
        {tab === 'stats' && <StatisticsTab stats={statsQuery.data} />}

        {tab === 'site' && (
          <Card title="Network" subtitle="Where this speaker is published across the network of sites">
            <div style={{ display: 'grid', gap: 12 }} data-testid="publication-panel">
              {talent.publications.map((pub) => (
                <div key={pub.brand} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ color: 'var(--text-body)' }}>{pub.brand_name}</div>
                    <div className="gb-meta-row">
                      {pub.published
                        ? `Published ${formatDateTime(pub.published_at!)} by ${pub.published_by}`
                        : 'Not published'}
                    </div>
                  </div>
                  {!talent.archived && canPublish && (
                    <Button
                      variant={pub.published ? 'secondary' : 'navy'}
                      size="sm"
                      onClick={() =>
                        void mutate(
                          () =>
                            api.post<Talent>(`/talent/${reference}/${pub.published ? 'unpublish' : 'publish'}`, {
                              brand: pub.brand,
                              version: talent.version,
                            }),
                          pub.published ? 'Unpublished' : 'Published',
                        )
                      }
                    >
                      {pub.published ? 'Unpublish' : 'Publish'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="gb-meta-row" style={{ marginTop: 12 }}>
              Day rate: <span className="gb-mono">{formatDayRate(talent.day_rate_pence)}</span>
            </p>
          </Card>
        )}

        {tab === 'history' && (
          <Card title="History" subtitle="Every change, attributed">
            <div style={{ display: 'grid', gap: 10 }} data-testid="history">
              {historyQuery.data?.items.map((h) => (
                <div key={h.id} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
                  <span>
                    <strong style={{ color: 'var(--text-body)' }}>{describeChange(h)}</strong>
                  </span>
                  <span className="gb-mono">
                    {h.actor} · {formatDateTime(h.at)}
                  </span>
                </div>
              ))}
              {historyQuery.data?.items.length === 0 && <p>No changes yet.</p>}
            </div>
          </Card>
        )}
      </div>

      {/* Archive confirmation names the talent and discloses auto-unpublish (FR-012) */}
      <Dialog
        open={archiveOpen}
        title={`Archive ${talent.name}`}
        subtitle={
          talent.publications.some((p) => p.published)
            ? 'This will also unpublish them from every brand website. Their record and history are kept.'
            : 'Their record and history are kept. You can restore them at any time.'
        }
        onClose={() => setArchiveOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setArchiveOpen(false)
                void mutate(
                  () => api.post<Talent>(`/talent/${reference}/archive`, { version: talent.version }),
                  'Speaker archived',
                )
              }}
            >
              Archive speaker
            </Button>
          </>
        }
      >
        <p>
          {talent.name} <span className="gb-ref">{talent.reference}</span> will leave the active directory and can no
          longer be offered or published.
        </p>
      </Dialog>

      {/* Concurrent edit conflict (FR-016) */}
      <Dialog
        open={conflict !== null}
        title="This record changed while you were editing"
        subtitle={conflict ? `Last updated ${formatDateTime(conflict.updated_at)} by ${conflict.updated_by}` : undefined}
        onClose={() => setConflict(null)}
        footer={
          <Button
            onClick={() => {
              setConflict(null)
              void refresh().then(() => setValues(null)) // re-hydrate only once the fresh record is in cache
            }}
          >
            Reload latest version
          </Button>
        }
      >
        <p>Someone else saved changes to this record. Reload to see the latest version, then reapply your edit.</p>
      </Dialog>
    </div>
  )
}

function describeChange(h: ChangeRecordItem): string {
  switch (h.action) {
    case 'created':
      return `Created as ${h.new_value}`
    case 'field_changed':
      return `${labelForField(h.field)} changed`
    case 'status_changed':
      return `Status: ${prettyStatus(h.old_value)} → ${prettyStatus(h.new_value)}`
    case 'published':
      return `Published to ${h.new_value}`
    case 'unpublished':
      return `Unpublished from ${h.old_value}`
    case 'archived':
      return 'Archived'
    case 'restored':
      return 'Restored'
    case 'photo_added':
      return 'Photo added'
    case 'photo_removed':
      return 'Photo removed'
    case 'topic_merged':
      return `Topic merged: ${h.old_value} → ${h.new_value}`
    case 'note_added':
      return 'Note added'
    case 'social_link_added':
      return `Social profile added (${h.new_value})`
    case 'social_link_removed':
      return `Social profile removed (${h.old_value})`
    case 'press_mention_added':
      return `Press mention added (${h.new_value})`
    case 'press_mention_removed':
      return `Press mention removed (${h.old_value})`
    case 'showreel_added':
      return `Showreel added (${h.new_value})`
    case 'showreel_removed':
      return `Showreel removed (${h.old_value})`
    case 'seo_updated':
      return 'SEO metadata updated'
    case 'onboarding_step_completed':
      return `Onboarding step completed: ${h.new_value}`
    case 'onboarding_step_reverted':
      return `Onboarding step reopened: ${h.new_value}`
    case 'onboarding_step_na':
      return `Onboarding step marked not applicable: ${h.new_value}`
    case 'fee_updated':
      return 'Fee schedule updated'
    case 'document_uploaded':
      return `Document uploaded: ${h.new_value}`
    case 'document_version_added':
      return `New document version: ${h.new_value}`
    case 'document_deleted':
      return `Document deleted: ${h.old_value}`
    case 'availability_added':
      return `Availability added: ${h.new_value}`
    case 'availability_updated':
      return `Availability updated: ${h.new_value}`
    case 'availability_removed':
      return `Availability removed: ${h.old_value}`
    case 'working_week_changed':
      return 'Working week changed'
    case 'enrichment_generated':
      return `Site bio generated: ${h.new_value}`
    case 'enrichment_edited':
      return `Site bio edited: ${h.new_value}`
    case 'enrichment_admin_approved':
      return `Site bio admin-approved: ${h.new_value}`
    case 'enrichment_talent_approved':
      return `Site bio talent-approved: ${h.new_value}`
    case 'enrichment_published':
      return `Site bio published: ${h.new_value}`
    case 'notable_post_added':
      return `Notable post added (${h.new_value})`
    case 'notable_post_removed':
      return `Notable post removed (${h.old_value})`
    case 'visibility_changed': {
      const noun = h.field === 'links' ? 'Social profile' : h.field === 'mentions' ? 'Press mention' : 'Notable post'
      return h.new_value === 'public' ? `${noun} shown on public sites` : `${noun} hidden from public sites`
    }
    default:
      return h.action
  }
}

function labelForField(field: string | null): string {
  const labels: Record<string, string> = {
    name: 'Name',
    headline: 'Headline',
    biography: 'Biography',
    day_rate_pence: 'Day rate',
    location: 'Location',
    email: 'Email',
    phone: 'Phone',
    topics: 'Topics',
  }
  return labels[field ?? ''] ?? field ?? 'Field'
}

function prettyStatus(value: string | null): string {
  const labels: Record<string, string> = TALENT_STATUS_LABELS
  return labels[value ?? ''] ?? value ?? ''
}

interface TalentStatsData {
  completeness: { publishable: boolean; missing: string[]; extended_missing: string[] }
  activity: { total: number; last_30_days: number; by_action: Record<string, number> }
  facts: {
    created_at: string
    created_by: string
    updated_at: string
    updated_by: string
    status: string
    status_since: string
    topics: number
    photos: number
    published_brands: number
  }
}

const COMPLETENESS_LABELS: Record<string, string> = {
  day_rate: 'Day rate',
  biography: 'Biography',
  photo: 'Photo',
  headline: 'Headline',
  location: 'Location',
  contact: 'Contact details',
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created',
  field_changed: 'Profile edits',
  status_changed: 'Status changes',
  published: 'Published',
  unpublished: 'Unpublished',
  archived: 'Archived',
  restored: 'Restored',
  photo_added: 'Photos added',
  photo_removed: 'Photos removed',
  topic_merged: 'Topic merges',
}

function StatisticsTab({ stats }: { stats: TalentStatsData | undefined }) {
  if (!stats) return <p className="gb-meta-row">Loading…</p>
  const allEssentials = ['day_rate', 'biography', 'photo']
  const allExtended = ['headline', 'location', 'contact']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }} data-testid="stats-tab">
      <Card title="Completeness" subtitle={stats.completeness.publishable ? 'Ready to publish' : 'Missing publication essentials'}>
        <div style={{ display: 'grid', gap: 8 }}>
          {allEssentials.map((item) => (
            <div key={item} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
              <span>{COMPLETENESS_LABELS[item]}</span>
              {stats.completeness.missing.includes(item) ? (
                <Badge tone="warning">Missing</Badge>
              ) : (
                <Badge tone="success">Complete</Badge>
              )}
            </div>
          ))}
          {allExtended.map((item) => (
            <div key={item} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
              <span>{COMPLETENESS_LABELS[item]}</span>
              {stats.completeness.extended_missing.includes(item) ? (
                <Badge tone="neutral">Not set</Badge>
              ) : (
                <Badge tone="success">Complete</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Activity" subtitle={`${stats.activity.total} changes all-time · ${stats.activity.last_30_days} in the last 30 days`}>
        <div style={{ display: 'grid', gap: 8 }}>
          {Object.entries(stats.activity.by_action).map(([action, n]) => (
            <div key={action} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
              <span>{ACTION_LABELS[action] ?? action}</span>
              <span className="gb-mono">{n}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Profile facts">
        <div style={{ display: 'grid', gap: 8 }}>
          <div className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
            <span>Created</span>
            <span className="gb-mono">
              {formatDateTime(stats.facts.created_at)} by {stats.facts.created_by}
            </span>
          </div>
          <div className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
            <span>Last updated</span>
            <span className="gb-mono">
              {formatDateTime(stats.facts.updated_at)} by {stats.facts.updated_by}
            </span>
          </div>
          <div className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
            <span>Current status</span>
            <span>
              <Badge tone={TALENT_STATUS_TONES[stats.facts.status as TalentStatus]} dot>
                {TALENT_STATUS_LABELS[stats.facts.status as TalentStatus]}
              </Badge>{' '}
              <span className="gb-mono">since {formatDateTime(stats.facts.status_since)}</span>
            </span>
          </div>
          <div className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
            <span>Topics</span>
            <span className="gb-mono">{stats.facts.topics}</span>
          </div>
          <div className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
            <span>Photos</span>
            <span className="gb-mono">{stats.facts.photos}</span>
          </div>
          <div className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
            <span>Published to</span>
            <span className="gb-mono">{stats.facts.published_brands} brand(s)</span>
          </div>
        </div>
      </Card>
    </div>
  )
}


interface TalentNote {
  id: number
  author: string
  body: string
  created_at: string
}

function NotesTab({ notes, onAdd }: { notes: TalentNote[]; onAdd: (body: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <Card title="Internal notes" subtitle="Working notes for the team — never shown outside the admin">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          setSaving(true)
          void onAdd(draft.trim()).then((ok) => {
            if (ok) setDraft('')
            setSaving(false)
          })
        }}
      >
        <Textarea
          label="Add a note"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Prefers morning sessions; agent handles all fee conversations"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Button type="submit" disabled={saving || !draft.trim()}>
            Add note
          </Button>
        </div>
      </form>
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }} data-testid="notes-list">
        {notes.map((n) => (
          <div
            key={n.id}
            style={{
              borderLeft: '3px solid var(--gb-navy)',
              background: 'var(--surface-raised)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-body)' }}>{n.body}</div>
            <div className="gb-meta-row gb-mono" style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
              {n.author} · {formatDateTime(n.created_at)}
            </div>
          </div>
        ))}
        {notes.length === 0 && <p className="gb-meta-row">No notes yet — anything the team should know lives here.</p>}
      </div>
    </Card>
  )
}

interface SocialLink {
  id: number
  platform: SocialPlatform
  url: string
  handle: string | null
  followers: number | null
  followers_set_at: string | null
  followers_set_by: string | null
  public: number
}
interface PressMention {
  id: number
  title: string
  outlet: string
  url: string
  published_on: string
  public: number
}
interface NotablePost {
  id: number
  platform: SocialPlatform
  url: string
  caption: string | null
  interactions: number
  posted_on: string
  public: number
}
interface SocialData {
  links: SocialLink[]
  mentions: PressMention[]
  posts: NotablePost[]
  total_followers: number
}

function SocialTab({
  data,
  reference,
  onChanged,
  toast,
}: {
  data: SocialData | undefined
  reference: string
  onChanged: () => Promise<void>
  toast: ReturnType<typeof useToast>
}) {
  const [addLink, setAddLink] = useState(false)
  const [linkForm, setLinkForm] = useState({ platform: 'linkedin', url: '', handle: '', followers: '' })
  const [addMention, setAddMention] = useState(false)
  const [mentionForm, setMentionForm] = useState({ title: '', outlet: '', url: '', published_on: '' })
  const [addPost, setAddPost] = useState(false)
  const [postForm, setPostForm] = useState({ platform: 'instagram', url: '', caption: '', interactions: '', posted_on: '' })
  const [editingFollowers, setEditingFollowers] = useState<{ id: number; value: string } | null>(null)

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      await onChanged()
      toast({ tone: 'success', title: ok })
      return true
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
      return false
    }
  }

  if (!data) return <p className="gb-meta-row">Loading…</p>

  return (
    <div style={{ display: 'grid', gap: 20 }} data-testid="social-tab">
      <Card
        title="Social profiles"
        subtitle={`Total recorded reach: ${formatFollowers(data.total_followers)}`}
        actions={
          <Button size="sm" onClick={() => { setLinkForm({ platform: 'linkedin', url: '', handle: '', followers: '' }); setAddLink(true) }}>
            Add profile
          </Button>
        }
      >
        <div style={{ display: 'grid', gap: 10 }} data-testid="social-links">
          {data.links.map((l) => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <div>
                <div style={{ color: 'var(--text-strong)' }}>
                  {SOCIAL_PLATFORM_LABELS[l.platform]}
                  {l.handle ? <span className="gb-meta-row"> · {l.handle}</span> : null}
                </div>
                <a href={l.url} target="_blank" rel="noreferrer" className="gb-meta-row">{l.url}</a>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6 }}>
                  <Switch label="Show on public sites" checked={l.public === 1} onChange={(v) => void run(() => api.patch(`/social/links/${l.id}/public`, { public: v }), v ? 'Now on public sites' : 'Hidden from public sites')} />
                  <span className="gb-meta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-2xs)', opacity: 0.55 }} title="Automatic follower sync is coming soon">
                    <Link2 size={12} /> Connect · coming soon
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {editingFollowers?.id === l.id ? (
                  <span style={{ display: 'inline-flex', gap: 6 }}>
                    <input
                      className="gb-input gb-input--sm"
                      style={{ width: 110 }}
                      inputMode="numeric"
                      value={editingFollowers.value}
                      onChange={(e) => setEditingFollowers({ id: l.id, value: e.target.value })}
                      aria-label="Follower count"
                    />
                    <Button size="sm" onClick={() =>
                      void run(() => api.patch(`/social/links/${l.id}`, { followers: editingFollowers.value === '' ? null : Number(editingFollowers.value.replace(/[,\s]/g, '')) }), 'Reach updated').then((ok) => ok && setEditingFollowers(null))
                    }>Save</Button>
                  </span>
                ) : (
                  <button type="button" className="gb-btn gb-btn--ghost gb-btn--sm" onClick={() => setEditingFollowers({ id: l.id, value: l.followers == null ? '' : String(l.followers) })}>
                    <span className="gb-mono" style={{ color: 'var(--text-strong)' }}>{formatFollowers(l.followers)}</span>
                  </button>
                )}
                {l.followers_set_at && (
                  <div className="gb-meta-row" style={{ fontSize: 'var(--fs-2xs)' }}>
                    as of {formatDateTime(l.followers_set_at)} · {l.followers_set_by}
                  </div>
                )}
              </div>
              <IconButton label="Remove profile" size="sm" variant="ghost" onClick={() => void run(() => api.delete(`/social/links/${l.id}`), 'Profile removed')}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
          {data.links.length === 0 && <p className="gb-meta-row">No social profiles recorded yet.</p>}
        </div>
      </Card>

      <Card
        title="Notable posts"
        subtitle="Posts that earned significant traction, newest first"
        actions={
          <Button size="sm" onClick={() => { setPostForm({ platform: 'instagram', url: '', caption: '', interactions: '', posted_on: '' }); setAddPost(true) }}>
            Add post
          </Button>
        }
      >
        <div style={{ display: 'grid', gap: 12 }} data-testid="notable-posts">
          {data.posts.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-strong)', fontWeight: 500 }}>
                  {p.caption || SOCIAL_PLATFORM_LABELS[p.platform]}
                </a>
                <div className="gb-meta-row">
                  {SOCIAL_PLATFORM_LABELS[p.platform]} · <span className="gb-mono">{formatFollowers(p.interactions)}</span> interactions · {formatDate(p.posted_on)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Switch label="Show on public sites" checked={p.public === 1} onChange={(v) => void run(() => api.patch(`/social/posts/${p.id}/public`, { public: v }), v ? 'Now on public sites' : 'Hidden from public sites')} />
                </div>
              </div>
              <IconButton label="Remove post" size="sm" variant="ghost" onClick={() => void run(() => api.delete(`/social/posts/${p.id}`), 'Post removed')}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
          {data.posts.length === 0 && <p className="gb-meta-row">No notable posts recorded yet.</p>}
        </div>
      </Card>

      <Card
        title="Press & news"
        subtitle="Recent coverage, newest first"
        actions={
          <Button size="sm" onClick={() => { setMentionForm({ title: '', outlet: '', url: '', published_on: '' }); setAddMention(true) }}>
            Add mention
          </Button>
        }
      >
        <div style={{ display: 'grid', gap: 12 }} data-testid="press-mentions">
          {data.mentions.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <a href={m.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-strong)', fontWeight: 500 }}>{m.title}</a>
                <div className="gb-meta-row">{m.outlet} · {formatDate(m.published_on)}</div>
                <div style={{ marginTop: 6 }}>
                  <Switch label="Show on public sites" checked={m.public === 1} onChange={(v) => void run(() => api.patch(`/social/mentions/${m.id}/public`, { public: v }), v ? 'Now on public sites' : 'Hidden from public sites')} />
                </div>
              </div>
              <IconButton label="Remove mention" size="sm" variant="ghost" onClick={() => void run(() => api.delete(`/social/mentions/${m.id}`), 'Mention removed')}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))}
          {data.mentions.length === 0 && <p className="gb-meta-row">No press mentions logged yet.</p>}
        </div>
      </Card>

      <Dialog
        open={addLink}
        title="Add social profile"
        onClose={() => setAddLink(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddLink(false)}>Cancel</Button>
            <Button onClick={() =>
              void run(() => api.post(`/talent/${reference}/social/links`, {
                platform: linkForm.platform,
                url: linkForm.url.trim(),
                handle: linkForm.handle.trim() || null,
                followers: linkForm.followers.trim() === '' ? null : Number(linkForm.followers.replace(/[,\s]/g, '')),
              }), 'Profile added').then((ok) => ok && setAddLink(false))
            }>Add profile</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Select label="Platform" value={linkForm.platform} onChange={(e) => setLinkForm({ ...linkForm, platform: e.target.value })}
            options={SOCIAL_PLATFORMS.map((p) => ({ value: p, label: SOCIAL_PLATFORM_LABELS[p] }))} />
          <Input label="Link (https)" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} placeholder="https://…" />
          <Input label="Handle (optional)" value={linkForm.handle} onChange={(e) => setLinkForm({ ...linkForm, handle: e.target.value })} placeholder="@name" />
          <Input label="Followers (optional)" inputMode="numeric" value={linkForm.followers} onChange={(e) => setLinkForm({ ...linkForm, followers: e.target.value })} placeholder="e.g. 12500" />
        </div>
      </Dialog>

      <Dialog
        open={addMention}
        title="Add press mention"
        onClose={() => setAddMention(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddMention(false)}>Cancel</Button>
            <Button onClick={() =>
              void run(() => api.post(`/talent/${reference}/social/mentions`, {
                title: mentionForm.title.trim(),
                outlet: mentionForm.outlet.trim(),
                url: mentionForm.url.trim(),
                published_on: mentionForm.published_on,
              }), 'Mention added').then((ok) => ok && setAddMention(false))
            }>Add mention</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Headline" value={mentionForm.title} onChange={(e) => setMentionForm({ ...mentionForm, title: e.target.value })} />
          <Input label="Outlet" value={mentionForm.outlet} onChange={(e) => setMentionForm({ ...mentionForm, outlet: e.target.value })} placeholder="e.g. BBC News" />
          <Input label="Link (https)" value={mentionForm.url} onChange={(e) => setMentionForm({ ...mentionForm, url: e.target.value })} placeholder="https://…" />
          <Input label="Published on" type="date" value={mentionForm.published_on} onChange={(e) => setMentionForm({ ...mentionForm, published_on: e.target.value })} />
        </div>
      </Dialog>

      <Dialog
        open={addPost}
        title="Add notable post"
        onClose={() => setAddPost(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddPost(false)}>Cancel</Button>
            <Button onClick={() =>
              void run(() => api.post(`/talent/${reference}/social/posts`, {
                platform: postForm.platform,
                url: postForm.url.trim(),
                caption: postForm.caption.trim() || null,
                interactions: postForm.interactions.trim() === '' ? 0 : Number(postForm.interactions.replace(/[,\s]/g, '')),
                posted_on: postForm.posted_on,
              }), 'Post added').then((ok) => ok && setAddPost(false))
            }>Add post</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Select label="Platform" value={postForm.platform} onChange={(e) => setPostForm({ ...postForm, platform: e.target.value })}
            options={SOCIAL_PLATFORMS.map((p) => ({ value: p, label: SOCIAL_PLATFORM_LABELS[p] }))} />
          <Input label="Link (https)" value={postForm.url} onChange={(e) => setPostForm({ ...postForm, url: e.target.value })} placeholder="https://…" />
          <Input label="Caption (optional)" value={postForm.caption} onChange={(e) => setPostForm({ ...postForm, caption: e.target.value })} placeholder="What the post was about" />
          <Input label="Interactions" inputMode="numeric" value={postForm.interactions} onChange={(e) => setPostForm({ ...postForm, interactions: e.target.value })} placeholder="e.g. 12500" />
          <Input label="Posted on" type="date" value={postForm.posted_on} onChange={(e) => setPostForm({ ...postForm, posted_on: e.target.value })} />
        </div>
      </Dialog>
    </div>
  )
}
