import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Film, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, Dialog, IconButton, Input, Textarea, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { makeDisplayRendition } from '../lib/image'
import type { PhotoRef, Talent } from '../lib/types'
import { PHOTO_CATEGORY_LABELS, SEO_LIMITS, type PhotoCategory } from '@shared/media'
import { formatDateTime } from '@shared/format'

interface Showreel {
  id: number
  title: string | null
  url: string
  provider: string
  thumbnail: string | null
}
interface Seo {
  meta_title: string | null
  meta_description: string | null
  focus_keyword: string | null
  updated_at: string
  updated_by: string
}
interface MediaData {
  showreels: Showreel[]
  seo: Seo | null
}

export function MediaTab({
  talent,
  reference,
  onPhotosChanged,
}: {
  talent: Talent
  reference: string
  onPhotosChanged: () => Promise<void>
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const headshotInput = useRef<HTMLInputElement>(null)
  const eventInput = useRef<HTMLInputElement>(null)

  const media = useQuery({
    queryKey: ['media', reference],
    queryFn: () => api.get<MediaData>(`/talent/${reference}/media`),
  })

  const [addReel, setAddReel] = useState(false)
  const [reelForm, setReelForm] = useState({ title: '', url: '' })
  const [seoForm, setSeoForm] = useState<{ meta_title: string; meta_description: string; focus_keyword: string } | null>(null)

  const refreshMedia = () => queryClient.invalidateQueries({ queryKey: ['media', reference] })
  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: ['history', reference] })

  const uploadPhoto = async (file: File, category: PhotoCategory) => {
    const form = new FormData()
    form.set('file', file)
    form.set('category', category)
    const rendition = await makeDisplayRendition(file)
    if (rendition) form.set('display', new File([rendition], 'display.webp', { type: 'image/webp' }))
    try {
      await api.upload<PhotoRef>(`/talent/${reference}/photos`, form)
      await Promise.all([onPhotosChanged(), refreshHistory()])
      toast({ tone: 'success', title: 'Photo added' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not upload photo', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    }
  }

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      await Promise.all([refreshMedia(), refreshHistory()])
      toast({ tone: 'success', title: ok })
      return true
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
      return false
    }
  }

  const headshots = talent.photos.filter((p) => p.category === 'headshot')
  const events = talent.photos.filter((p) => p.category === 'event')
  const seo = media.data?.seo
  const effectiveSeo = seoForm ?? {
    meta_title: seo?.meta_title ?? '',
    meta_description: seo?.meta_description ?? '',
    focus_keyword: seo?.focus_keyword ?? '',
  }

  const photoGrid = (photos: PhotoRef[], emptyText: string) =>
    photos.length === 0 ? (
      <p className="gb-meta-row">{emptyText}</p>
    ) : (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {photos.map((p) => (
          <div key={p.id} style={{ position: 'relative' }}>
            <img
              src={p.url}
              alt=""
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
                <IconButton label="Delete photo" size="sm" variant="secondary"
                  onClick={() => void api.delete(`/photos/${p.id}`).then(() => Promise.all([onPhotosChanged(), refreshHistory()])).catch(() => toast({ tone: 'danger', title: 'Could not delete photo' }))}>
                  <Trash2 size={14} />
                </IconButton>
              </div>
            )}
          </div>
        ))}
      </div>
    )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }} data-testid="media-tab">
      <div style={{ display: 'grid', gap: 20 }}>
        <input ref={headshotInput} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f, 'headshot'); e.target.value = '' }} />
        <input ref={eventInput} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f, 'event'); e.target.value = '' }} />

        <Card title={PHOTO_CATEGORY_LABELS.headshot} subtitle="Portrait shots — one is the profile avatar"
          actions={!talent.archived && <Button size="sm" iconLeft={<Upload size={14} />} onClick={() => headshotInput.current?.click()}>Upload headshot</Button>}>
          {photoGrid(headshots, 'No headshots yet — an initials avatar is shown instead.')}
        </Card>

        <Card title={PHOTO_CATEGORY_LABELS.event} subtitle="The speaker in action at events"
          actions={!talent.archived && <Button size="sm" iconLeft={<Upload size={14} />} onClick={() => eventInput.current?.click()}>Upload event photo</Button>}>
          {photoGrid(events, 'No event photos yet.')}
        </Card>

        <Card title="Showreels" subtitle="Video links (YouTube, Vimeo or elsewhere)"
          actions={!talent.archived && <Button size="sm" iconLeft={<Film size={14} />} onClick={() => { setReelForm({ title: '', url: '' }); setAddReel(true) }}>Add showreel</Button>}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }} data-testid="showreels">
            {(media.data?.showreels ?? []).map((r) => (
              <div key={r.id} style={{ width: 200 }}>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" style={{ width: 200, height: 112, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 200, height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <Film size={28} />
                    </div>
                  )}
                </a>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div>
                    <div style={{ color: 'var(--text-body)', fontSize: 'var(--fs-sm)' }}>{r.title || 'Showreel'}</div>
                    <Badge tone="neutral" size="sm">{r.provider}</Badge>
                  </div>
                  {!talent.archived && (
                    <IconButton label="Remove showreel" size="sm" variant="ghost" onClick={() => void run(() => api.delete(`/showreels/${r.id}`), 'Showreel removed')}>
                      <Trash2 size={14} />
                    </IconButton>
                  )}
                </div>
              </div>
            ))}
            {(media.data?.showreels ?? []).length === 0 && <p className="gb-meta-row">No showreels yet.</p>}
          </div>
        </Card>
      </div>

      <Card title="SEO metadata" subtitle={seo ? `Updated ${formatDateTime(seo.updated_at)} by ${seo.updated_by}` : 'For the speaker’s public page'}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <Input label="Meta title" value={effectiveSeo.meta_title}
              onChange={(e) => setSeoForm({ ...effectiveSeo, meta_title: e.target.value })} />
            <div className="gb-meta-row" style={{ fontSize: 'var(--fs-2xs)', marginTop: 4 }}>
              {effectiveSeo.meta_title.length}/{SEO_LIMITS.title} — {effectiveSeo.meta_title.length > SEO_LIMITS.title ? 'may be truncated in search' : 'good length'}
            </div>
          </div>
          <div>
            <Textarea label="Meta description" rows={3} value={effectiveSeo.meta_description}
              onChange={(e) => setSeoForm({ ...effectiveSeo, meta_description: e.target.value })} />
            <div className="gb-meta-row" style={{ fontSize: 'var(--fs-2xs)', marginTop: 4 }}>
              {effectiveSeo.meta_description.length}/{SEO_LIMITS.description} — {effectiveSeo.meta_description.length > SEO_LIMITS.description ? 'may be truncated in search' : 'good length'}
            </div>
          </div>
          <Input label="Focus keyword" value={effectiveSeo.focus_keyword}
            onChange={(e) => setSeoForm({ ...effectiveSeo, focus_keyword: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" disabled={seoForm === null}
              onClick={() => void run(() => api.put(`/talent/${reference}/seo`, {
                meta_title: effectiveSeo.meta_title.trim() || null,
                meta_description: effectiveSeo.meta_description.trim() || null,
                focus_keyword: effectiveSeo.focus_keyword.trim() || null,
              }), 'SEO saved').then((ok) => ok && setSeoForm(null))}>
              Save SEO
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={addReel} title="Add showreel" onClose={() => setAddReel(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setAddReel(false)}>Cancel</Button>
          <Button onClick={() => void run(() => api.post(`/talent/${reference}/showreels`, { title: reelForm.title.trim() || null, url: reelForm.url.trim() }), 'Showreel added').then((ok) => ok && setAddReel(false))}>Add showreel</Button>
        </>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Video link (https)" value={reelForm.url} onChange={(e) => setReelForm({ ...reelForm, url: e.target.value })} placeholder="https://youtu.be/…" />
          <Input label="Title (optional)" value={reelForm.title} onChange={(e) => setReelForm({ ...reelForm, title: e.target.value })} placeholder="e.g. 2026 keynote reel" />
        </div>
      </Dialog>
    </div>
  )
}
