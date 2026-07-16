import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2, Upload } from 'lucide-react'
import { Avatar, Badge, Button, Card, Dialog, IconButton, Select, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { penceToPounds, poundsToPence } from '../lib/hooks'
import { makeDisplayRendition } from '../lib/image'
import { useCan } from '../lib/operator'
import type { ChangeRecordItem, PhotoRef, Talent } from '../lib/types'
import { TALENT_STATUSES, TALENT_STATUS_LABELS, TALENT_STATUS_TONES } from '@shared/enums'
import { formatDateTime, formatDayRate } from '@shared/format'
import { TalentFields, validateTalentForm, type TalentFormValues } from './talent-form'

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
  const fileInput = useRef<HTMLInputElement>(null)
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

  const uploadPhoto = async (file: File) => {
    const form = new FormData()
    form.set('file', file)
    const rendition = await makeDisplayRendition(file)
    if (rendition) form.set('display', new File([rendition], 'display.webp', { type: 'image/webp' }))
    try {
      await api.upload<PhotoRef>(`/talent/${reference}/photos`, form)
      await refresh()
      toast({ tone: 'success', title: 'Photo added' })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not upload photo', message })
    }
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 20 }}>
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
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          <Card
            title="Photos"
            actions={
              !talent.archived && (
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Upload size={14} />}
                  onClick={() => fileInput.current?.click()}
                >
                  Upload photo
                </Button>
              )
            }
          >
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadPhoto(file)
                e.target.value = ''
              }}
            />
            {talent.photos.length === 0 ? (
              <p className="gb-meta-row">No photos yet — an initials avatar is shown instead.</p>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {talent.photos.map((p) => (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <img
                      src={p.url}
                      alt={talent.name}
                      style={{
                        width: 96,
                        height: 96,
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        border: p.is_primary ? '2px solid var(--gb-red)' : '1px solid var(--border)',
                      }}
                    />
                    {!talent.archived && (
                      <div style={{ position: 'absolute', top: 4, right: 4 }}>
                        <IconButton
                          label="Delete photo"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void api
                              .delete(`/photos/${p.id}`)
                              .then(refresh)
                              .catch(() => toast({ tone: 'danger', title: 'Could not delete photo' }))
                          }
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Publication" subtitle="Per-brand website presence">
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
                            api.post<Talent>(
                              `/talent/${reference}/${pub.published ? 'unpublish' : 'publish'}`,
                              { brand: pub.brand, version: talent.version },
                            ),
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
        </div>
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
