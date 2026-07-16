import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { Badge, Button, Card, Dialog, Input, Switch, Table, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from '@shared/permissions'
import { formatDateTime } from '@shared/format'

interface TeamOperator {
  id: number
  email: string
  role: 'owner' | 'operator'
  grants: Permission[]
  added_at: string
  added_by: string
}

interface AuditItem {
  id: number
  actor: string
  subject_email: string
  action: string
  detail: string | null
  at: string
}

const AUDIT_LABELS: Record<string, string> = {
  owner_bootstrapped: 'Owner established',
  operator_added: 'Operator added',
  operator_removed: 'Operator removed',
  permission_granted: 'Permission granted',
  permission_revoked: 'Permission revoked',
}

export function TeamScreen() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const operators = useQuery({
    queryKey: ['team'],
    queryFn: () => api.get<{ items: TeamOperator[] }>('/team/operators'),
  })
  const audit = useQuery({
    queryKey: ['team-audit'],
    queryFn: () => api.get<{ items: AuditItem[] }>('/team/audit?per_page=50'),
  })

  const [addOpen, setAddOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [removing, setRemoving] = useState<TeamOperator | null>(null)

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['team'] }),
      queryClient.invalidateQueries({ queryKey: ['team-audit'] }),
    ])

  const run = async (fn: () => Promise<unknown>, successTitle: string) => {
    try {
      await fn()
      await refresh()
      toast({ tone: 'success', title: successTitle })
      return true
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not save', message })
      return false
    }
  }

  const toggleGrant = (op: TeamOperator, permission: Permission, granted: boolean) => {
    const grants = granted ? [...op.grants, permission] : op.grants.filter((g) => g !== permission)
    void run(
      () => api.put(`/team/operators/${op.id}/grants`, { grants }),
      granted ? 'Permission granted' : 'Permission revoked',
    )
  }

  return (
    <div>
      <div className="gb-page-head">
        <h1>Team</h1>
        <Button iconLeft={<UserPlus size={16} />} onClick={() => { setNewEmail(''); setAddOpen(true) }}>
          Add operator
        </Button>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <Card
          title="Operators"
          subtitle="Sign-in access is managed separately in Cloudflare Access — this list controls what each person may do inside the admin"
          padded={false}
        >
          <Table<TeamOperator & Record<string, unknown>>
            columns={[
              {
                key: 'email',
                header: 'Operator',
                render: (op) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--text-strong)' }}>{op.email}</span>
                    {op.role === 'owner' ? <Badge tone="red">Owner</Badge> : <Badge tone="neutral">Operator</Badge>}
                  </div>
                ),
              },
              {
                key: 'grants',
                header: 'Permissions',
                render: (op) =>
                  op.role === 'owner' ? (
                    <span className="gb-meta-row">Everything, always</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {PERMISSIONS.map((p) => (
                        <Switch
                          key={p}
                          label={PERMISSION_LABELS[p]}
                          checked={op.grants.includes(p)}
                          onChange={(checked) => toggleGrant(op, p, checked)}
                        />
                      ))}
                    </div>
                  ),
              },
              {
                key: 'added',
                header: 'Added',
                render: (op) => (
                  <span className="gb-meta-row">
                    {formatDateTime(op.added_at)} by {op.added_by}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (op) =>
                  op.role === 'owner' ? null : (
                    <Button variant="ghost" size="sm" onClick={() => setRemoving(op)}>
                      Remove
                    </Button>
                  ),
              },
            ]}
            rows={(operators.data?.items ?? []) as (TeamOperator & Record<string, unknown>)[]}
          />
        </Card>

        <Card title="Team audit trail" subtitle="Every access change, attributed" padded>
          <div style={{ display: 'grid', gap: 10 }} data-testid="team-audit">
            {audit.data?.items.map((a) => (
              <div key={a.id} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
                <span>
                  <strong style={{ color: 'var(--text-body)' }}>
                    {AUDIT_LABELS[a.action] ?? a.action}
                  </strong>{' '}
                  — {a.subject_email}
                  {a.detail ? ` (${PERMISSION_LABELS[a.detail as Permission] ?? a.detail})` : ''}
                </span>
                <span className="gb-mono">
                  {a.actor} · {formatDateTime(a.at)}
                </span>
              </div>
            ))}
            {audit.data?.items.length === 0 && <p>No team changes yet.</p>}
          </div>
        </Card>
      </div>

      <Dialog
        open={addOpen}
        title="Add operator"
        subtitle="They start with no special permissions — grant what they need after adding. Remember to also allow their email in Cloudflare Access."
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                void run(() => api.post('/team/operators', { email: newEmail.trim() }), 'Operator added').then(
                  (ok) => ok && setAddOpen(false),
                )
              }
            >
              Add operator
            </Button>
          </>
        }
      >
        <Input
          label="Email address"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="name@example.com"
        />
      </Dialog>

      <Dialog
        open={removing !== null}
        title={`Remove ${removing?.email ?? ''}`}
        subtitle="They lose access immediately. Their name stays on everything they changed."
        onClose={() => setRemoving(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const target = removing
                setRemoving(null)
                if (target) void run(() => api.delete(`/team/operators/${target.id}`), 'Operator removed')
              }}
            >
              Remove operator
            </Button>
          </>
        }
      >
        <p>Also remove them from the Cloudflare Access allow-list to fully revoke sign-in.</p>
      </Dialog>
    </div>
  )
}
