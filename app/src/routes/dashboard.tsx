import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, FileUp, Plus, Users } from 'lucide-react'
import { Badge, Button, Card, StatCard } from '../components'
import { api } from '../lib/api'
import { TALENT_STATUSES, TALENT_STATUS_LABELS, type TalentStatus } from '@shared/enums'
import { formatDateTime, formatExactCount } from '@shared/format'

interface DashboardData {
  counts: {
    active: number
    by_status: Record<TalentStatus, number>
    published: { brand: string; brand_name: string; count: number }[]
    topics: number
  }
  attention: {
    ready_to_publish: { items: { reference: string; name: string; updated_at: string }[]; total: number }
    blocked: { items: { reference: string; name: string; missing: string[] }[]; total: number }
  }
  activity: {
    reference: string
    name: string
    actor: string
    action: string
    field: string | null
    old_value: string | null
    new_value: string | null
    at: string
  }[]
}

const MISSING_LABELS: Record<string, string> = {
  day_rate: 'No day rate',
  biography: 'No biography',
  photo: 'No photo',
}

const STATUS_ACCENTS: Record<TalentStatus, 'red' | 'navy' | 'blue' | 'success'> = {
  available: 'success',
  on_hold: 'red',
  booked: 'blue',
  confirmed: 'blue',
  cancelled: 'navy',
}

function describeActivity(a: DashboardData['activity'][number]): string {
  switch (a.action) {
    case 'created':
      return a.field === 'import' ? 'imported' : `created as ${a.new_value}`
    case 'field_changed':
      return a.field === 'import' ? 'imported from the old system' : `${(a.field ?? 'profile').replace(/_/g, ' ')} updated`
    case 'status_changed':
      return `status set to ${TALENT_STATUS_LABELS[(a.new_value ?? '') as TalentStatus] ?? a.new_value}`
    case 'published':
      return `published to ${a.new_value}`
    case 'unpublished':
      return `unpublished from ${a.old_value}`
    case 'archived':
      return 'archived'
    case 'restored':
      return 'restored'
    case 'photo_added':
      return 'photo added'
    case 'photo_removed':
      return 'photo removed'
    case 'topic_merged':
      return `topic merged into ${a.new_value}`
    case 'note_added':
      return 'internal note added'
    case 'showreel_added':
      return 'showreel added'
    case 'showreel_removed':
      return 'showreel removed'
    case 'seo_updated':
      return 'SEO metadata updated'
    case 'onboarding_step_completed':
      return `onboarding step completed: ${a.new_value}`
    case 'onboarding_step_reverted':
      return `onboarding step reopened: ${a.new_value}`
    case 'onboarding_step_na':
      return `onboarding step marked not applicable: ${a.new_value}`
    case 'fee_updated':
      return 'fee schedule updated'
    case 'document_uploaded':
      return `document uploaded: ${a.new_value}`
    case 'document_version_added':
      return `new document version: ${a.new_value}`
    case 'document_deleted':
      return `document deleted: ${a.old_value}`
    default:
      return a.action
  }
}

export function DashboardScreen() {
  const navigate = useNavigate()
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<DashboardData>('/dashboard') })
  const data = dashboard.data

  if (!data) return null

  const empty = data.counts.active === 0

  return (
    <div>
      <div className="gb-page-head">
        <h1>Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" iconLeft={<FileUp size={16} />} onClick={() => navigate('/import')}>
            Import roster
          </Button>
          <Button iconLeft={<Plus size={16} />} onClick={() => navigate('/talent/new')}>
            Add speaker
          </Button>
        </div>
      </div>

      {empty ? (
        <Card>
          <div className="gb-empty">
            <div className="gb-empty__icon">
              <Users size={40} />
            </div>
            <h2 style={{ fontSize: 'var(--fs-h3)', marginBottom: 8 }}>The roster is empty</h2>
            <p>Add your first speaker, or import the existing roster from an export file.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <Button onClick={() => navigate('/talent/new')}>Add speaker</Button>
              <Button variant="secondary" onClick={() => navigate('/import')}>
                Import roster
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}
            data-testid="kpi-grid"
          >
            <Link to="/speakers" style={{ textDecoration: 'none' }}>
              <StatCard label="Active speakers" value={formatExactCount(data.counts.active)} accent="red" icon={<Users size={20} />} />
            </Link>
            {TALENT_STATUSES.map((s) => (
              <Link key={s} to={`/speakers?status=${s}`} style={{ textDecoration: 'none' }}>
                <StatCard
                  label={TALENT_STATUS_LABELS[s]}
                  value={formatExactCount(data.counts.by_status[s] ?? 0)}
                  accent={STATUS_ACCENTS[s]}
                />
              </Link>
            ))}
            {data.counts.published.map((b) => (
              <StatCard
                key={b.brand}
                label={`Published — ${b.brand_name}`}
                value={formatExactCount(b.count)}
                accent="navy"
                icon={<CheckCircle2 size={20} />}
              />
            ))}
            <Link to="/topics" style={{ textDecoration: 'none' }}>
              <StatCard label="Topics in use" value={formatExactCount(data.counts.topics)} accent="blue" />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <Card
              title="Ready to publish"
              subtitle={`${formatExactCount(data.attention.ready_to_publish.total)} complete profiles not yet on any site`}
            >
              <div style={{ display: 'grid', gap: 10 }} data-testid="ready-list">
                {data.attention.ready_to_publish.items.map((i) => (
                  <div key={i.reference} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
                    <Link to={`/talent/${i.reference}`}>
                      {i.name} <span className="gb-ref">{i.reference}</span>
                    </Link>
                    <span className="gb-mono">{formatDateTime(i.updated_at)}</span>
                  </div>
                ))}
                {data.attention.ready_to_publish.total === 0 && <p>Nothing waiting — all complete profiles are live.</p>}
                {data.attention.ready_to_publish.total > data.attention.ready_to_publish.items.length && (
                  <Link to="/speakers">See all {formatExactCount(data.attention.ready_to_publish.total)}</Link>
                )}
              </div>
            </Card>

            <Card
              title="Blocked from publishing"
              subtitle={`${formatExactCount(data.attention.blocked.total)} profiles missing essentials`}
            >
              <div style={{ display: 'grid', gap: 10 }} data-testid="blocked-list">
                {data.attention.blocked.items.map((i) => (
                  <div key={i.reference} className="gb-meta-row" style={{ justifyContent: 'space-between', gap: 12 }}>
                    <Link to={`/talent/${i.reference}`}>
                      {i.name} <span className="gb-ref">{i.reference}</span>
                    </Link>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      {i.missing.map((m) => (
                        <Badge key={m} tone="warning" size="sm">
                          {MISSING_LABELS[m] ?? m}
                        </Badge>
                      ))}
                    </span>
                  </div>
                ))}
                {data.attention.blocked.total === 0 && <p>No blockers — every profile is publishable.</p>}
                {data.attention.blocked.total > data.attention.blocked.items.length && (
                  <Link to="/speakers">See all {formatExactCount(data.attention.blocked.total)}</Link>
                )}
              </div>
            </Card>
          </div>

          <Card title="Recent activity" subtitle="Across the whole roster, attributed">
            <div style={{ display: 'grid', gap: 10 }} data-testid="activity-feed">
              {data.activity.map((a, i) => (
                <div key={i} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
                  <span>
                    <Link to={`/talent/${a.reference}`} style={{ fontWeight: 500 }}>
                      {a.name}
                    </Link>{' '}
                    {describeActivity(a)}
                  </span>
                  <span className="gb-mono">
                    {a.actor} · {formatDateTime(a.at)}
                  </span>
                </div>
              ))}
              {data.activity.length === 0 && <p>All quiet — no changes recorded yet.</p>}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
