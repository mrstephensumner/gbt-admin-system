import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react'
import { Badge, Button, Card, Dialog, Input, Select, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import type { AvailabilityData, AvailabilityEntry } from '../lib/types'
import {
  AVAILABILITY_LABELS,
  AVAILABILITY_STATES,
  AVAILABILITY_TONES,
  buildMonthGrid,
  cellState,
  entryCoversDate,
  isWorkingDay,
  WORKING_WEEKS,
  WORKING_WEEK_LABELS,
  type AvailabilityState,
} from '@shared/availability'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATE_COLOR: Record<AvailabilityState, string> = {
  available: '#2f9e5e',
  pencilled: '#c79a3c',
  confirmed: '#1e6fd9',
  blocked: '#c8102e',
}

interface Form {
  id?: number
  state: AvailabilityState
  title: string
  detail: string
  location: string
  start_date: string
  end_date: string
}

export function AvailabilityTab({ reference }: { reference: string }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const today = new Date()
  const [ym, setYm] = useState({ y: today.getUTCFullYear(), m: today.getUTCMonth() + 1 })
  const month = `${ym.y}-${String(ym.m).padStart(2, '0')}`
  const [form, setForm] = useState<Form | null>(null)
  const [busy, setBusy] = useState(false)

  const q = useQuery({
    queryKey: ['availability', reference, month],
    queryFn: () => api.get<AvailabilityData>(`/talent/${reference}/availability?month=${month}`),
  })
  const data = q.data
  const entries = data?.entries ?? []
  const workingWeek = (data?.working_week ?? 'mon_fri') as (typeof WORKING_WEEKS)[number]

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['availability', reference] }),
      queryClient.invalidateQueries({ queryKey: ['history', reference] }),
      queryClient.invalidateQueries({ queryKey: ['stats', reference] }),
    ])

  function step(delta: number) {
    setYm((cur) => {
      const m0 = cur.m - 1 + delta
      return { y: cur.y + Math.floor(m0 / 12), m: ((m0 % 12) + 12) % 12 + 1 }
    })
  }

  function openAdd(date: string, state: AvailabilityState = 'pencilled') {
    setForm({ state, title: '', detail: '', location: '', start_date: date, end_date: date })
  }
  function openEdit(e: AvailabilityEntry) {
    setForm({ id: e.id, state: e.state, title: e.title, detail: e.detail ?? '', location: e.location ?? '', start_date: e.start_date, end_date: e.end_date })
  }

  async function save() {
    if (!form) return
    setBusy(true)
    try {
      const payload = {
        state: form.state,
        title: form.title,
        detail: form.detail.trim() === '' ? null : form.detail.trim(),
        location: form.location.trim() === '' ? null : form.location.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
      }
      if (form.id) await api.patch(`/talent/${reference}/availability/${form.id}`, payload)
      else await api.post(`/talent/${reference}/availability`, payload)
      await refresh()
      setForm(null)
      toast({ tone: 'success', title: form.id ? 'Entry updated' : 'Entry added' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!form?.id) return
    setBusy(true)
    try {
      await api.delete(`/talent/${reference}/availability/${form.id}`)
      await refresh()
      setForm(null)
      toast({ tone: 'success', title: 'Entry removed' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not remove', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  async function changeWorkingWeek(value: string) {
    try {
      await api.patch(`/talent/${reference}/availability/settings`, { working_week: value })
      await refresh()
      toast({ tone: 'success', title: 'Working week updated' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not update', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    }
  }

  const weeks = buildMonthGrid(ym.y, ym.m)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(260px, 320px)', gap: 20, alignItems: 'start' }}>
      {/* Calendar */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ color: 'var(--text-body)', margin: 0, fontSize: 18 }}>{MONTHS[ym.m - 1]} {ym.y}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => step(-1)}><ChevronLeft size={15} /> Prev</Button>
            <Button variant="secondary" onClick={() => step(1)}>Next <ChevronRight size={15} /></Button>
            <Button onClick={() => openAdd(`${month}-01`, 'blocked')}><CalendarPlus size={15} /> Block dates</Button>
          </div>
        </div>

        <div data-testid="availability-calendar" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="gb-meta-row" style={{ textAlign: 'left', fontSize: 11, textTransform: 'uppercase', paddingLeft: 4 }}>{w}</div>
          ))}
          {weeks.flat().map((cell) => {
            const dayStates = entries.filter((e) => entryCoversDate(e, cell.date)).map((e) => e.state)
            const state = cellState(dayStates)
            const working = isWorkingDay(cell.weekdayMon0, workingWeek)
            if (!cell.inMonth) return <div key={cell.date} />
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => openAdd(cell.date)}
                style={{
                  textAlign: 'left', minHeight: 72, padding: 8, borderRadius: 8, cursor: 'pointer',
                  border: state ? `1px solid ${STATE_COLOR[state]}` : '1px solid var(--border, rgba(255,255,255,0.08))',
                  background: state ? `${STATE_COLOR[state]}1f` : working ? 'transparent' : 'rgba(255,255,255,0.02)',
                  opacity: working ? 1 : 0.55,
                }}
              >
                <div style={{ color: 'var(--text-body)', fontVariantNumeric: 'tabular-nums' }}>{cell.day}</div>
                {state && <div style={{ marginTop: 8, fontSize: 12, color: STATE_COLOR[state] }}>{AVAILABILITY_LABELS[state]}</div>}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          {AVAILABILITY_STATES.map((s) => (
            <span key={s} className="gb-meta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: STATE_COLOR[s] }} />
              {AVAILABILITY_LABELS[s]}
            </span>
          ))}
        </div>
      </Card>

      {/* Sidebar */}
      <div style={{ display: 'grid', gap: 20 }}>
        <Card title="This month">
          <div style={{ display: 'grid', gap: 12 }} data-testid="availability-list">
            {entries.length === 0 && <p className="gb-meta-row">Nothing scheduled this month.</p>}
            {entries.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => openEdit(e)}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 0 }}
              >
                <span style={{ textAlign: 'center', minWidth: 34 }}>
                  <span style={{ display: 'block', color: 'var(--text-body)', fontWeight: 600 }}>{new Date(e.start_date).getUTCDate()}</span>
                  <span className="gb-meta-row" style={{ fontSize: 11, textTransform: 'uppercase' }}>{MONTHS[new Date(e.start_date).getUTCMonth()]!.slice(0, 3)}</span>
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: 'var(--text-body)' }}>{e.title}</span>
                  <span className="gb-meta-row" style={{ fontSize: 12 }}>{[e.detail, e.location].filter(Boolean).join(' · ') || AVAILABILITY_LABELS[e.state]}</span>
                </span>
                <Badge tone={AVAILABILITY_TONES[e.state]} dot>{AVAILABILITY_LABELS[e.state]}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Sync">
          <Select
            label="Default working week"
            value={workingWeek}
            options={WORKING_WEEKS.map((w) => ({ value: w, label: WORKING_WEEK_LABELS[w] }))}
            onChange={(e) => void changeWorkingWeek(e.target.value)}
          />
          <div style={{ marginTop: 12 }}>
            <Button variant="secondary" disabled block>
              <CalendarClock size={15} /> Connect Google Calendar
            </Button>
            <p className="gb-meta-row" style={{ fontSize: 12, marginTop: 6 }}>Calendar sync is coming soon.</p>
          </div>
        </Card>
      </div>

      {/* Add / edit dialog */}
      {form && (
        <Dialog open title={form.id ? 'Edit entry' : 'Add availability'} onClose={() => setForm(null)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Select
              label="State"
              value={form.state}
              options={AVAILABILITY_STATES.map((s) => ({ value: s, label: AVAILABILITY_LABELS[s] }))}
              onChange={(e) => setForm({ ...form, state: e.target.value as AvailabilityState })}
            />
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Barclays Events, Annual leave" />
            <Input label="Detail (optional)" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="e.g. Keynote" />
            <Input label="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. London" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="From" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <Input label="To" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 20 }}>
            <span>{form.id && <Button variant="danger" disabled={busy} onClick={() => void remove()}>Remove</Button>}</span>
            <span style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button disabled={busy || form.title.trim() === ''} onClick={() => void save()}>{form.id ? 'Save' : 'Add entry'}</Button>
            </span>
          </div>
        </Dialog>
      )}
    </div>
  )
}
