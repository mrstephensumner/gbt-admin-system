import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Film, GripVertical, Star, Trash2, Upload } from 'lucide-react'
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
  const [editingReel, setEditingReel] = useState<{ id: number; title: string } | null>(null)
  const [seoForm, setSeoForm] = useState<{ meta_title: string; meta_description: string; focus_keyword: string } | null>(null)
  const [drag, setDrag] = useState<{ kind: 'headshot' | 'event' | 'showreel'; id: string } | null>(null)

  const refreshMedia = () => queryClient.invalidateQueries({ queryKey: ['media', reference] })
  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: ['history', reference] })

  const runMedia = async (fn: () => Promise<unknown>, ok: string) => {
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
  const runPhoto = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      await Promise.all([onPhotosChanged(), refreshHistory()])
      if (ok) toast({ tone: 'success', title: ok })
      return true
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
      return false
    }
  }

  const uploadPhoto = async (file: File, category: PhotoCategory) => {
    const form = new FormData()
    form.set('file', file)
    form.set('category', category)
    const rendition = await makeDisplayRendition(file)
    if (rendition) form.set('display', new File([rendition], 'display.webp', { type: 'image/webp' }))
    await runPhoto(() => api.upload<PhotoRef>(`/talent/${reference}/photos`, form), 'Photo added')
  }

  const reorderPhotos = (category: 'headshot' | 'event', ids: string[]) =>
    runPhoto(() => api.put(`/talent/${reference}/photo-order`, { category, ids }), '')

  const headshots = talent.photos.filter((p) => p.category === 'headshot').sort((a, b) => a.sort_order - b.sort_order)
  const events = talent.photos.filter((p) => p.category === 'event').sort((a, b) => a.sort_order - b.sort_order)
  const showreels = media.data?.showreels ?? []
  const seo = media.data?.seo
  const effectiveSeo = seoForm ?? {
    meta_title: seo?.meta_title ?? '',
    meta_description: seo?.meta_description ?? '',
    focus_keyword: seo?.focus_keyword ?? '',
  }

  /** Drop `dragged` before/at `targetId` within a category, then persist. */
  const dropPhoto = (category: 'headshot' | 'event', list: PhotoRef[], targetId: string) => {
    if (!drag || drag.kind !== category) return
    const ids = list.map((p) => p.id)
    const from = ids.indexOf(drag.id)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1 || from === to) return
    ids.splice(to, 0, ids.splice(from, 1)[0]!)
    void reorderPhotos(category, ids)
    setDrag(null)
  }

  const photoGrid = (category: 'headshot' | 'event', photos: PhotoRef[], emptyText: string) =>
    photos.length === 0 ? (
      <p className="gb-meta-row">{emptyText}</p>
    ) : (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }} data-testid={`photos-${category}`}>
        {photos.map((p) => (
          <div
            key={p.id}
            draggable={!talent.archived}
            onDragStart={() => setDrag({ kind: category, id: p.id })}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropPhoto(category, photos, p.id)}
            style={{ width: 120, opacity: drag?.id === p.id ? 0.4 : 1 }}
          >
            <div style={{ position: 'relative' }}>
              <img src={p.url} alt={p.caption ?? ''} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: p.is_primary ? '2px solid var(--gb-red)' : '1px solid var(--border)' }} />
              {!talent.archived && (
                <>
                  {category === 'headshot' && (
                    <div style={{ position: 'absolute', top: 4, left: 4 }}>
                      <IconButton label={p.is_primary ? 'Current avatar' : 'Set as avatar'} size="sm" variant={p.is_primary ? 'primary' : 'secondary'}
                        onClick={() => !p.is_primary && void runPhoto(() => api.patch(`/photos/${p.id}`, { is_primary: true }), 'Avatar updated')}>
                        <Star size={13} />
                      </IconButton>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 4, right: 4 }}>
                    <IconButton label="Delete photo" size="sm" variant="secondary"
                      onClick={() => void runPhoto(() => api.delete(`/photos/${p.id}`), 'Photo removed')}>
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                  <div style={{ position: 'absolute', bottom: 4, right: 4, color: 'var(--text-faint)', cursor: 'grab' }}>
                    <GripVertical size={14} />
                  </div>
                </>
              )}
            </div>
            {!talent.archived && (
              <input className="gb-input gb-input--sm" style={{ marginTop: 4, fontSize: 'var(--fs-2xs)' }}
                placeholder="Caption…" defaultValue={p.caption ?? ''} aria-label="Photo caption"
                onBlur={(e) => { if (e.target.value !== (p.caption ?? '')) void runPhoto(() => api.patch(`/photos/${p.id}`, { caption: e.target.value.trim() || null }), '') }} />
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

        <Card title={PHOTO_CATEGORY_LABELS.headshot} subtitle="Portrait shots — the starred one is the profile avatar · drag to reorder"
          actions={!talent.archived && <Button size="sm" iconLeft={<Upload size={14} />} onClick={() => headshotInput.current?.click()}>Upload headshot</Button>}>
          {photoGrid('headshot', headshots, 'No headshots yet — an initials avatar is shown instead.')}
        </Card>

        <Card title={PHOTO_CATEGORY_LABELS.event} subtitle="The speaker in action · drag to reorder"
          actions={!talent.archived && <Button size="sm" iconLeft={<Upload size={14} />} onClick={() => eventInput.current?.click()}>Upload event photo</Button>}>
          {photoGrid('event', events, 'No event photos yet.')}
        </Card>

        <Card title="Showreels" subtitle="Video links (YouTube, Vimeo or elsewhere) · drag to reorder"
          actions={!talent.archived && <Button size="sm" iconLeft={<Film size={14} />} onClick={() => { setReelForm({ title: '', url: '' }); setAddReel(true) }}>Add showreel</Button>}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }} data-testid="showreels">
            {showreels.map((r) => (
              <div key={r.id} style={{ width: 200, opacity: drag?.id === String(r.id) ? 0.4 : 1 }}
                draggable={!talent.archived}
                onDragStart={() => setDrag({ kind: 'showreel', id: String(r.id) })}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (!drag || drag.kind !== 'showreel') return
                  const ids = showreels.map((s) => s.id)
                  const from = ids.indexOf(Number(drag.id))
                  const to = ids.indexOf(r.id)
                  if (from !== -1 && to !== -1 && from !== to) {
                    ids.splice(to, 0, ids.splice(from, 1)[0]!)
                    void runMedia(() => api.put(`/talent/${reference}/showreel-order`, { ids }), 'Order saved')
                  }
                  setDrag(null)
                }}>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" style={{ width: 200, height: 112, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
                  ) : (
                    <div style={{ width: 200, height: 112, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <Film size={28} />
                    </div>
                  )}
                </a>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <button type="button" className="gb-btn gb-btn--ghost gb-btn--sm" style={{ padding: 0, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', color: 'var(--text-body)' }}
                      onClick={() => !talent.archived && setEditingReel({ id: r.id, title: r.title ?? '' })}>
                      {r.title || 'Untitled — edit'}
                    </button>
                    <Badge tone="neutral" size="sm">{r.provider}</Badge>
                  </div>
                  {!talent.archived && (
                    <IconButton label="Remove showreel" size="sm" variant="ghost" onClick={() => void runMedia(() => api.delete(`/showreels/${r.id}`), 'Showreel removed')}>
                      <Trash2 size={14} />
                    </IconButton>
                  )}
                </div>
              </div>
            ))}
            {showreels.length === 0 && <p className="gb-meta-row">No showreels yet.</p>}
          </div>
        </Card>
      </div>

      <Card title="SEO metadata" subtitle={seo ? `Updated ${formatDateTime(seo.updated_at)} by ${seo.updated_by}` : 'For the speaker’s public page'}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <Input label="Meta title" value={effectiveSeo.meta_title} onChange={(e) => setSeoForm({ ...effectiveSeo, meta_title: e.target.value })} />
            <div className="gb-meta-row" style={{ fontSize: 'var(--fs-2xs)', marginTop: 4 }}>
              {effectiveSeo.meta_title.length}/{SEO_LIMITS.title} — {effectiveSeo.meta_title.length > SEO_LIMITS.title ? 'may be truncated in search' : 'good length'}
            </div>
          </div>
          <div>
            <Textarea label="Meta description" rows={3} value={effectiveSeo.meta_description} onChange={(e) => setSeoForm({ ...effectiveSeo, meta_description: e.target.value })} />
            <div className="gb-meta-row" style={{ fontSize: 'var(--fs-2xs)', marginTop: 4 }}>
              {effectiveSeo.meta_description.length}/{SEO_LIMITS.description} — {effectiveSeo.meta_description.length > SEO_LIMITS.description ? 'may be truncated in search' : 'good length'}
            </div>
          </div>
          <Input label="Focus keyword" value={effectiveSeo.focus_keyword} onChange={(e) => setSeoForm({ ...effectiveSeo, focus_keyword: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="sm" disabled={seoForm === null}
              onClick={() => void runMedia(() => api.put(`/talent/${reference}/seo`, {
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
          <Button onClick={() => void runMedia(() => api.post(`/talent/${reference}/showreels`, { title: reelForm.title.trim() || null, url: reelForm.url.trim() }), 'Showreel added').then((ok) => ok && setAddReel(false))}>Add showreel</Button>
        </>}>
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Video link (https)" value={reelForm.url} onChange={(e) => setReelForm({ ...reelForm, url: e.target.value })} placeholder="https://youtu.be/…" />
          <Input label="Title (optional)" value={reelForm.title} onChange={(e) => setReelForm({ ...reelForm, title: e.target.value })} placeholder="e.g. 2026 keynote reel" />
        </div>
      </Dialog>

      <Dialog open={editingReel !== null} title="Edit showreel title" onClose={() => setEditingReel(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setEditingReel(null)}>Cancel</Button>
          <Button onClick={() => { const e = editingReel; setEditingReel(null); if (e) void runMedia(() => api.patch(`/showreels/${e.id}`, { title: e.title.trim() || null }), 'Showreel updated') }}>Save title</Button>
        </>}>
        {editingReel && (
          <Input label="Title" value={editingReel.title} onChange={(e) => setEditingReel({ ...editingReel, title: e.target.value })} />
        )}
      </Dialog>
    </div>
  )
}
