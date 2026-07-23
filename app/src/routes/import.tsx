import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp, Upload } from 'lucide-react'
import { Badge, Button, Card, Checkbox, Dialog, Input, Pagination, Table, Tabs, Tag, Textarea, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { parseRosterFile, type ParsedFile } from '../lib/parseRosterFile'
import { penceToPounds, poundsToPence } from '../lib/hooks'
import { CANDIDATE_STATUS_LABELS, type CandidateStatus } from '@shared/importing'
import { formatDayRate, formatDateTime, formatExactCount } from '@shared/format'

interface RunReport {
  run_id: number
  dry_run: boolean
  rows_found: number
  rows_clean: number
  rows_problem: number
  problems: { row: number; reason: string }[]
  staged_new: number
  refreshed: number
  untouched_imported: number
  untouched_skipped: number
}

interface Candidate {
  id: number
  source_id: string
  name: string
  headline: string | null
  biography: string | null
  topics: string[]
  day_rate_pence: number | null
  location: string | null
  email: string | null
  phone: string | null
  photo_url: string | null
  gaps: string[]
  duplicate_of: string | null
  status: CandidateStatus
  talent_reference: string | null
}

interface TransferItem {
  id: number
  file_name: string
  operator: string
  at: string
  rows_found: number
  rows_staged: number
  rows_problem: number
  dry_run: number
}

export function ImportScreen() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [parsed, setParsed] = useState<(ParsedFile & { fileName: string }) | null>(null)
  const [report, setReport] = useState<RunReport | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [status, setStatus] = useState<CandidateStatus>('new')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Candidate | null>(null)
  const [editValues, setEditValues] = useState({ name: '', topics: '', dayRatePounds: '' })
  const [approveProgress, setApproveProgress] = useState<string | null>(null)

  const candidates = useQuery({
    queryKey: ['import-candidates', status, page],
    queryFn: () => api.get<{ items: Candidate[]; total: number; per_page: number }>(
      `/import/candidates?status=${status}&page=${page}&per_page=25`,
    ),
  })
  const transfers = useQuery({
    queryKey: ['import-runs'],
    queryFn: () => api.get<{ items: TransferItem[] }>('/import/runs?per_page=8'),
  })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['import-candidates'] }),
      queryClient.invalidateQueries({ queryKey: ['import-runs'] }),
      queryClient.invalidateQueries({ queryKey: ['directory'] }),
    ])

  const pickFile = async (file: File) => {
    setBusy('Reading file…')
    setReport(null)
    try {
      const result = await parseRosterFile(file)
      setParsed({ ...result, fileName: file.name })
      setBusy('Validating…')
      const dry = await api.post<RunReport>('/import/runs', {
        file_name: file.name,
        dry_run: true,
        rows: result.rows,
      })
      setReport(dry)
      await queryClient.invalidateQueries({ queryKey: ['import-runs'] })
    } catch (err) {
      const message = err instanceof ApiClientError || err instanceof Error ? err.message : 'The file could not be read'
      toast({ tone: 'danger', title: 'Could not validate file', message })
      setParsed(null)
    } finally {
      setBusy(null)
    }
  }

  const confirmStage = async () => {
    if (!parsed) return
    setBusy('Staging candidates…')
    try {
      const staged = await api.post<RunReport>('/import/runs', {
        file_name: parsed.fileName,
        dry_run: false,
        rows: parsed.rows,
      })
      setReport(staged)
      setParsed(null)
      await refresh()
      toast({ tone: 'success', title: 'Candidates staged', message: `${staged.staged_new} new, ${staged.refreshed} refreshed` })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not stage file', message })
    } finally {
      setBusy(null)
    }
  }

  const bulkApprove = async () => {
    const ids = [...selected]
    setSelected(new Set())
    let ok = 0
    const failures: string[] = []
    for (let i = 0; i < ids.length; i += 25) {
      setApproveProgress(`Approving ${Math.min(i + 25, ids.length)} of ${ids.length}…`)
      try {
        const res = await api.post<{ results: { id: number; ok: boolean; reason?: string }[] }>('/import/approve', {
          ids: ids.slice(i, i + 25),
        })
        ok += res.results.filter((r) => r.ok).length
        failures.push(...res.results.filter((r) => !r.ok).map((r) => r.reason ?? 'Unknown reason'))
      } catch (err) {
        failures.push(err instanceof ApiClientError ? err.message : 'Something went wrong')
      }
    }
    setApproveProgress(null)
    await refresh()
    toast({
      tone: failures.length ? 'warning' : 'success',
      title: `${ok} approved`,
      message: failures.length ? `${failures.length} could not be approved — first reason: ${failures[0]}` : undefined,
    })
  }

  /** Approve every New candidate: loop pages, excluding ones that failed so the loop always terminates. */
  const approveAll = async () => {
    const failed = new Set<number>()
    const failures: string[] = []
    let ok = 0
    for (;;) {
      const pageData = await api.get<{ items: Candidate[]; total: number }>(
        '/import/candidates?status=new&per_page=50&page=1',
      )
      const ids = pageData.items.map((c) => c.id).filter((id) => !failed.has(id)).slice(0, 25)
      if (ids.length === 0) break
      setApproveProgress(`Approved ${ok} — ${pageData.total} remaining…`)
      try {
        const res = await api.post<{ results: { id: number; ok: boolean; reason?: string }[] }>('/import/approve', {
          ids,
        })
        for (const r of res.results) {
          if (r.ok) ok++
          else {
            failed.add(r.id)
            failures.push(r.reason ?? 'Unknown reason')
          }
        }
      } catch (err) {
        ids.forEach((id) => failed.add(id))
        failures.push(err instanceof ApiClientError ? err.message : 'Something went wrong')
      }
    }
    setApproveProgress(null)
    await refresh()
    toast({
      tone: failures.length ? 'warning' : 'success',
      title: `${ok} approved`,
      message: failures.length
        ? `${failures.length} left in the queue to review — first reason: ${failures[0]}`
        : 'The whole queue is now in the roster',
    })
  }

  const openEdit = (c: Candidate) => {
    setEditing(c)
    setEditValues({ name: c.name, topics: c.topics.join('; '), dayRatePounds: penceToPounds(c.day_rate_pence) })
  }

  const saveEdit = async () => {
    if (!editing) return
    try {
      await api.patch(`/import/candidates/${editing.id}`, {
        name: editValues.name.trim(),
        topics: editValues.topics.split(/[;|,]/).map((t) => t.trim()).filter(Boolean),
        day_rate_pence: poundsToPence(editValues.dayRatePounds),
      })
      setEditing(null)
      await refresh()
      toast({ tone: 'success', title: 'Candidate updated' })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not save', message })
    }
  }

  const items = candidates.data?.items ?? []
  const pageCount = candidates.data ? Math.max(1, Math.ceil(candidates.data.total / candidates.data.per_page)) : 1

  return (
    <div>
      <div className="gb-page-head">
        <h1>Import roster</h1>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <Card title="Import talent data" subtitle="Drop an export file, validate it, then stage candidates for review">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void pickFile(file)
              e.target.value = ''
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload roster file"
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) void pickFile(file)
            }}
            style={{
              border: '1px dashed var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '36px 24px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <div style={{ color: 'var(--gb-red)', marginBottom: 8 }}>
              <FileUp size={28} />
            </div>
            {busy ?? 'Drop a file or click to browse — CSV, XLSX or JSON, up to 25 MB'}
          </div>

          {report && (
            <div style={{ marginTop: 16 }} data-testid="validation-report">
              <div className="gb-meta-row" style={{ gap: 12, marginBottom: 8 }}>
                <Badge tone="info">{formatExactCount(report.rows_found)} rows found</Badge>
                <Badge tone="success">{formatExactCount(report.rows_clean)} clean</Badge>
                <Badge tone={report.rows_problem ? 'warning' : 'neutral'}>
                  {formatExactCount(report.rows_problem)} problems
                </Badge>
                {report.untouched_imported > 0 && <Badge tone="neutral">{report.untouched_imported} already imported</Badge>}
                {report.untouched_skipped > 0 && <Badge tone="neutral">{report.untouched_skipped} skipped previously</Badge>}
                {!report.dry_run && <Badge tone="success">{report.staged_new} staged, {report.refreshed} refreshed</Badge>}
              </div>
              {parsed && parsed.unmappedHeaders.length > 0 && (
                <p className="gb-meta-row">Columns not recognised (ignored): {parsed.unmappedHeaders.join(', ')}</p>
              )}
              {report.problems.length > 0 && (
                <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 8 }}>
                  {report.problems.map((p, i) => (
                    <div key={i} className="gb-meta-row">
                      Row {p.row}: {p.reason}
                    </div>
                  ))}
                </div>
              )}
              {report.dry_run && parsed && (
                <div style={{ marginTop: 12 }}>
                  <Button iconLeft={<Upload size={16} />} onClick={() => void confirmStage()} disabled={busy !== null}>
                    Stage {formatExactCount(report.rows_clean)} candidates
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card
          title="Candidates"
          subtitle="Review, tidy and approve — approved candidates become talent records, unpublished"
          actions={
            status === 'new' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="sm"
                  variant="navy"
                  disabled={approveProgress !== null || (candidates.data?.total ?? 0) === 0}
                  onClick={() => void approveAll()}
                >
                  {approveProgress ?? 'Approve all new'}
                </Button>
                <Button
                  size="sm"
                  disabled={selected.size === 0 || approveProgress !== null}
                  onClick={() => void bulkApprove()}
                >
                  {`Approve selected (${selected.size})`}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void api.delete<{ deleted: number }>('/import/candidates').then(async (r) => {
                      await refresh()
                      toast({ tone: 'success', title: `${r.deleted} candidates cleared` })
                    })
                  }
                >
                  Clear staging
                </Button>
              </div>
            )
          }
          padded={false}
        >
          <div style={{ padding: '12px 20px 0' }}>
            <Tabs
              tabs={(['new', 'imported', 'skipped'] as const).map((s) => ({ value: s, label: CANDIDATE_STATUS_LABELS[s] }))}
              value={status}
              onChange={(v) => {
                setStatus(v as CandidateStatus)
                setPage(1)
                setSelected(new Set())
              }}
            />
          </div>
          <Table<Candidate & Record<string, unknown>>
            columns={[
              ...(status === 'new'
                ? [
                    {
                      key: 'select',
                      header: '',
                      width: 40,
                      render: (c: Candidate) => (
                        <Checkbox
                          checked={selected.has(c.id)}
                          onChange={(checked) => {
                            const next = new Set(selected)
                            if (checked) next.add(c.id)
                            else next.delete(c.id)
                            setSelected(next)
                          }}
                        />
                      ),
                    },
                  ]
                : []),
              {
                key: 'name',
                header: 'Candidate',
                render: (c: Candidate) => (
                  <div>
                    <div style={{ color: 'var(--text-strong)', fontWeight: 500 }}>{c.name}</div>
                    <div className="gb-ref">{c.source_id}</div>
                  </div>
                ),
              },
              {
                key: 'topics',
                header: 'Topics',
                render: (c: Candidate) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.topics.slice(0, 3).map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                ),
              },
              {
                key: 'day_rate',
                header: 'Day rate',
                align: 'right' as const,
                render: (c: Candidate) => <span className="gb-mono">{formatDayRate(c.day_rate_pence)}</span>,
              },
              {
                key: 'flags',
                header: 'Notes',
                render: (c: Candidate) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {c.duplicate_of && <Badge tone="warning">Possible duplicate of {c.duplicate_of}</Badge>}
                    {c.gaps.length > 0 && <Badge tone="neutral">{c.gaps.length} gaps</Badge>}
                    {c.talent_reference && <Badge tone="success">{c.talent_reference}</Badge>}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right' as const,
                render: (c: Candidate) =>
                  c.status === 'new' ? (
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void api.post(`/import/candidates/${c.id}/skip`, {}).then(async () => {
                            await refresh()
                            toast({ tone: 'success', title: 'Candidate skipped' })
                          })
                        }
                      >
                        Skip
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
            rows={items as (Candidate & Record<string, unknown>)[]}
            empty={<div className="gb-empty">No {CANDIDATE_STATUS_LABELS[status].toLowerCase()} candidates.</div>}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', alignItems: 'center' }}>
            <span className="gb-meta-row" data-testid="candidate-count">
              {candidates.data ? `Showing ${items.length} of ${formatExactCount(candidates.data.total)} candidates` : ''}
            </span>
            <Pagination page={page} pageCount={pageCount} onChange={setPage} />
          </div>
        </Card>

        <Card title="Recent transfers" subtitle="Every upload, attributed" padded>
          <div style={{ display: 'grid', gap: 10 }} data-testid="recent-transfers">
            {transfers.data?.items.map((t) => (
              <div key={t.id} className="gb-meta-row" style={{ justifyContent: 'space-between' }}>
                <span>
                  <strong style={{ color: 'var(--text-body)' }} className="gb-mono">
                    {t.file_name}
                  </strong>{' '}
                  — {formatExactCount(t.rows_found)} rows, {t.rows_staged} staged, {t.rows_problem} problems
                  {t.dry_run ? ' (validation only)' : ''}
                </span>
                <span className="gb-mono">
                  {t.operator} · {formatDateTime(t.at)}
                </span>
              </div>
            ))}
            {transfers.data?.items.length === 0 && <p>No transfers yet.</p>}
          </div>
        </Card>
      </div>

      <Dialog
        open={editing !== null}
        title={`Edit ${editing?.name ?? ''}`}
        subtitle="Changes apply to the candidate only — nothing reaches the roster until you approve"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()}>Save candidate</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <Input label="Full name" value={editValues.name} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })} />
          <Textarea
            label="Topics"
            rows={2}
            hint="Separate with semicolons — e.g. Leadership; After-Dinner"
            value={editValues.topics}
            onChange={(e) => setEditValues({ ...editValues, topics: e.target.value })}
          />
          <Input
            label="Day rate (GBP)"
            inputMode="numeric"
            value={editValues.dayRatePounds}
            onChange={(e) => setEditValues({ ...editValues, dayRatePounds: e.target.value })}
          />
          {editing && editing.gaps.length > 0 && (
            <div className="gb-meta-row">Gaps from the file: {editing.gaps.join(' · ')}</div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
