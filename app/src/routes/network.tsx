import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, Plus } from 'lucide-react'
import { Badge, Button, Card, Dialog, Input, Switch, Table, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'

interface Site {
  id: number
  slug: string
  name: string
  url: string | null
  active: boolean
  published_count: number
  brief_audience: string | null
  brief_tone: string | null
  brief_wordmin: number | null
  brief_wordmax: number | null
  brief_include: string | null
  brief_exclude: string | null
}

const emptyBrief = { audience: '', tone: '', wordmin: '', wordmax: '', include: '', exclude: '' }

export function NetworkScreen() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const sites = useQuery({ queryKey: ['network'], queryFn: () => api.get<{ items: Site[] }>('/network') })

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', url: '' })
  const [editing, setEditing] = useState<Site | null>(null)
  const [editForm, setEditForm] = useState({ name: '', url: '', ...emptyBrief })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['network'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ])

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      await refresh()
      toast({ tone: 'success', title: ok })
      return true
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
      return false
    }
  }

  const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  return (
    <div>
      <div className="gb-page-head">
        <h1>Network</h1>
        <Button iconLeft={<Plus size={16} />} onClick={() => { setForm({ name: '', slug: '', url: '' }); setAdding(true) }}>
          Add site
        </Button>
      </div>

      <Card
        title="Network sites"
        subtitle="The brand websites this admin powers — talent are published to these from each profile’s Network tab"
        padded={false}
      >
        <Table<Site & Record<string, unknown>>
          columns={[
            {
              key: 'name',
              header: 'Site',
              render: (s) => (
                <div>
                  <div style={{ color: 'var(--text-strong)', fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center' }}>
                    {s.name}
                    {!s.active && <Badge tone="neutral">Inactive</Badge>}
                  </div>
                  <div className="gb-ref">{s.slug}</div>
                </div>
              ),
            },
            {
              key: 'url',
              header: 'Address',
              render: (s) => (s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="gb-meta-row">{s.url}</a> : <span className="gb-meta-row">—</span>),
            },
            { key: 'published_count', header: 'Published', align: 'right', render: (s) => <span className="gb-mono">{s.published_count}</span> },
            {
              key: 'active',
              header: 'Active',
              align: 'center',
              render: (s) => (
                <Switch checked={s.active} onChange={(checked) => void run(() => api.patch(`/network/${s.id}`, { active: checked }), checked ? 'Site activated' : 'Site deactivated')} />
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (s) => (
                <Button size="sm" variant="secondary" onClick={() => { setEditing(s); setEditForm({ name: s.name, url: s.url ?? '', audience: s.brief_audience ?? '', tone: s.brief_tone ?? '', wordmin: s.brief_wordmin != null ? String(s.brief_wordmin) : '', wordmax: s.brief_wordmax != null ? String(s.brief_wordmax) : '', include: s.brief_include ?? '', exclude: s.brief_exclude ?? '' }) }}>Edit</Button>
              ),
            },
          ]}
          rows={(sites.data?.items ?? []) as (Site & Record<string, unknown>)[]}
          empty={
            <div className="gb-empty">
              <div className="gb-empty__icon"><Globe size={40} /></div>
              <p>No network sites yet — add the first brand website.</p>
            </div>
          }
        />
      </Card>

      <Dialog
        open={adding}
        title="Add network site"
        subtitle="The slug is a permanent identifier the public sites will key on — choose carefully."
        onClose={() => setAdding(false)}
        footer={<>
          <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
          <Button onClick={() => void run(() => api.post('/network', { name: form.name.trim(), slug: (form.slug.trim() || slugify(form.name)), url: form.url.trim() || null }), 'Site added').then((ok) => ok && setAdding(false))}>Add site</Button>
        </>}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Site name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} placeholder="e.g. Great British Presenters" />
          <Input label="Slug (permanent key)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="great-british-presenters" />
          <Input label="Address (optional, https)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
        </div>
      </Dialog>

      <Dialog
        open={editing !== null}
        title={`Edit ${editing?.name ?? ''}`}
        subtitle={`Slug ${editing?.slug ?? ''} is permanent and cannot change.`}
        onClose={() => setEditing(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={() => { const e = editing; setEditing(null); if (e) void run(() => api.patch(`/network/${e.id}`, {
            name: editForm.name.trim(), url: editForm.url.trim() || null,
            brief_audience: editForm.audience.trim() || null, brief_tone: editForm.tone.trim() || null,
            brief_wordmin: editForm.wordmin.trim() === '' ? null : Number(editForm.wordmin), brief_wordmax: editForm.wordmax.trim() === '' ? null : Number(editForm.wordmax),
            brief_include: editForm.include.trim() || null, brief_exclude: editForm.exclude.trim() || null,
          }), 'Site updated') }}>Save site</Button>
        </>}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Site name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Address (https)" value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="https://…" />
          <div style={{ marginTop: 8, borderTop: '1px solid var(--border, rgba(255,255,255,0.1))', paddingTop: 12 }}>
            <div style={{ color: 'var(--text-body)', marginBottom: 4 }}>Editorial brief</div>
            <p className="gb-meta-row" style={{ fontSize: 12, marginBottom: 10 }}>Steers AI-generated per-site bios so each site reads differently for its audience.</p>
            <Input label="Audience / positioning" value={editForm.audience} onChange={(e) => setEditForm({ ...editForm, audience: e.target.value })} placeholder="e.g. Corporate bookers seeking commercial keynotes" />
            <Input label="Tone" value={editForm.tone} onChange={(e) => setEditForm({ ...editForm, tone: e.target.value })} placeholder="e.g. Commercial, ROI-focused, confident" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Min words" type="number" value={editForm.wordmin} onChange={(e) => setEditForm({ ...editForm, wordmin: e.target.value })} placeholder="120" />
              <Input label="Max words" type="number" value={editForm.wordmax} onChange={(e) => setEditForm({ ...editForm, wordmax: e.target.value })} placeholder="180" />
            </div>
            <Input label="Emphasise (optional)" value={editForm.include} onChange={(e) => setEditForm({ ...editForm, include: e.target.value })} placeholder="e.g. Board-level experience, measurable outcomes" />
            <Input label="Avoid for this site (optional)" value={editForm.exclude} onChange={(e) => setEditForm({ ...editForm, exclude: e.target.value })} placeholder="e.g. After-dinner / entertainment framing" />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
