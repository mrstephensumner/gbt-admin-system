import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search, Users } from 'lucide-react'
import { Avatar, Badge, Button, Input, Pagination, Select, Table, Tabs, Tag } from '../components'
import { api } from '../lib/api'
import { useDebounced } from '../lib/hooks'
import type { DirectoryResponse, TalentSummary, TopicListItem } from '../lib/types'
import { TALENT_STATUSES, TALENT_STATUS_LABELS, TALENT_STATUS_TONES, type TalentStatus } from '@shared/enums'
import { FEE_BANDS, FEE_BAND_LABELS, type FeeBandFilter } from '@shared/feeBands'
import { formatDayRate, formatExactCount } from '@shared/format'

export function DirectoryScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounced(search)

  const view = params.get('view') === 'archived' ? 'archived' : 'active'
  const status = params.get('status') ?? ''
  const topic = params.get('topic') ?? ''
  const band = params.get('band') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1))

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page') // filters reset paging, not each other (US2-S3)
    setParams(next, { replace: true })
  }

  const queryString = useMemo(() => {
    const qs = new URLSearchParams()
    if (q) qs.set('q', q)
    if (status) qs.append('status', status)
    if (topic) qs.append('topic', topic)
    if (band) qs.set('band', band)
    qs.set('archived', view === 'archived' ? 'true' : 'false')
    qs.set('page', String(page))
    qs.set('per_page', '25')
    return qs.toString()
  }, [q, status, topic, band, view, page])

  const directory = useQuery({
    queryKey: ['directory', queryString],
    queryFn: () => api.get<DirectoryResponse>(`/talent?${queryString}`),
    placeholderData: keepPreviousData,
  })
  const topics = useQuery({
    queryKey: ['topics'],
    queryFn: () => api.get<{ items: TopicListItem[] }>('/topics'),
  })

  const data = directory.data
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1
  const hasFilters = !!(q || status || topic || band)

  const clearFilters = () => {
    setSearch('')
    const next = new URLSearchParams()
    if (view === 'archived') next.set('view', 'archived')
    setParams(next, { replace: true })
  }

  return (
    <div>
      <div className="gb-page-head">
        <h1>Speakers</h1>
        <Button iconLeft={<Plus size={16} />} onClick={() => navigate('/talent/new')}>
          Add speaker
        </Button>
      </div>

      <Tabs
        tabs={[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived' },
        ]}
        value={view}
        onChange={(v) => setParam('view', v === 'archived' ? 'archived' : '')}
      />

      <div className="gb-toolbar" style={{ marginTop: 16 }}>
        <div style={{ width: 280 }}>
          <Input
            placeholder="Search by name or reference"
            iconLeft={<Search size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setParam('q', e.target.value)
            }}
            aria-label="Search speakers"
          />
        </div>
        <div style={{ width: 170 }}>
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setParam('status', e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              ...TALENT_STATUSES.map((s) => ({ value: s, label: TALENT_STATUS_LABELS[s] })),
            ]}
          />
        </div>
        <div style={{ width: 190 }}>
          <Select
            aria-label="Filter by topic"
            value={topic}
            onChange={(e) => setParam('topic', e.target.value)}
            options={[
              { value: '', label: 'All topics' },
              ...(topics.data?.items.map((t) => ({ value: String(t.id), label: t.name })) ?? []),
            ]}
          />
        </div>
        <div style={{ width: 170 }}>
          <Select
            aria-label="Filter by fee band"
            value={band}
            onChange={(e) => setParam('band', e.target.value)}
            options={[
              { value: '', label: 'All fee bands' },
              ...[...FEE_BANDS, 'no_rate' as const].map((b) => ({
                value: b,
                label: FEE_BAND_LABELS[b as FeeBandFilter],
              })),
            ]}
          />
        </div>
        <div className="gb-toolbar__spacer" />
        <span className="gb-meta-row" data-testid="result-count">
          {data ? `Showing ${data.items.length} of ${formatExactCount(data.total)} speakers` : 'Loading…'}
        </span>
      </div>

      <Table<TalentSummary & Record<string, unknown>>
        columns={[
          {
            key: 'name',
            header: 'Speaker',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar src={row.primaryPhotoUrl ?? undefined} name={row.name} size={32} />
                <div>
                  <div style={{ color: 'var(--text-strong)', fontWeight: 500 }}>{row.name}</div>
                  <div className="gb-ref">{row.reference}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'topics',
            header: 'Topics',
            render: (row) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {row.topics.slice(0, 3).map((t) => (
                  <Tag key={t.id}>{t.name}</Tag>
                ))}
                {row.topics.length > 3 && <span className="gb-meta-row">+{row.topics.length - 3}</span>}
              </div>
            ),
          },
          {
            key: 'day_rate',
            header: 'Day rate',
            align: 'right',
            render: (row) => <span className="gb-mono">{formatDayRate(row.day_rate_pence)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <Badge tone={TALENT_STATUS_TONES[row.status as TalentStatus]} dot>
                {TALENT_STATUS_LABELS[row.status as TalentStatus]}
              </Badge>
            ),
          },
        ]}
        rows={(data?.items ?? []) as (TalentSummary & Record<string, unknown>)[]}
        rowKey="reference"
        onRowClick={(row) => navigate(`/talent/${row.reference}`)}
        empty={
          <div className="gb-empty">
            <div className="gb-empty__icon">
              <Users size={40} />
            </div>
            <p>No speakers match your search.</p>
            {hasFilters && (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Pagination page={page} pageCount={pageCount} onChange={(p) => setParam('page', String(p))} />
      </div>
    </div>
  )
}
