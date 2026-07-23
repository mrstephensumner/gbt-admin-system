import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, History, Trash2, Upload } from 'lucide-react'
import { Button, Card, Dialog, IconButton, Input, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import type { DocumentsData, DocumentVersion, TalentDocument } from '../lib/types'
import { formatFileSize } from '@shared/documents'
import { formatDateTime } from '@shared/format'

/**
 * Reusable talent documents panel (spec 011). Rendered standalone as the
 * Documents tab, and scoped to a single onboarding step via `stepKey`.
 */
export function DocumentsPanel({
  reference,
  stepKey,
  title,
  subtitle,
}: {
  reference: string
  stepKey?: string
  title: string
  subtitle: string
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ['documents', reference], queryFn: () => api.get<DocumentsData>(`/talent/${reference}/documents`) })
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingDoc = useRef<number | null>(null)
  const [docTitle, setDocTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [historyFor, setHistoryFor] = useState<TalentDocument | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<TalentDocument | null>(null)

  const docs = (q.data?.documents ?? []).filter((d) => (stepKey ? d.step_key === stepKey : true))

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['documents', reference] }),
      queryClient.invalidateQueries({ queryKey: ['history', reference] }),
      queryClient.invalidateQueries({ queryKey: ['stats', reference] }),
    ])

  function pick(documentId: number | null) {
    pendingDoc.current = documentId
    fileRef.current?.click()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      const documentId = pendingDoc.current
      let path: string
      if (documentId) {
        path = `/talent/${reference}/documents/${documentId}/versions`
      } else {
        if (docTitle.trim()) form.set('title', docTitle.trim())
        if (stepKey) form.set('step_key', stepKey)
        path = `/talent/${reference}/documents`
      }
      await api.upload(path, form)
      await refresh()
      setDocTitle('')
      toast({ tone: 'success', title: documentId ? 'New version uploaded' : 'Document uploaded' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Upload failed', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(doc: TalentDocument) {
    setBusy(true)
    try {
      await api.delete(`/talent/${reference}/documents/${doc.id}`)
      await refresh()
      toast({ tone: 'success', title: 'Document deleted' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not delete', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setConfirmDelete(null)
      setBusy(false)
    }
  }

  const downloadHref = (versionId: number) => `/api/talent/${reference}/documents/${versionId}/file`

  const actions = (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {!stepKey && (
        <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Title (optional)" style={{ width: 200 }} />
      )}
      <Button disabled={busy} onClick={() => pick(null)}>
        <Upload size={15} /> Upload document
      </Button>
    </div>
  )

  return (
    <Card title={title} subtitle={subtitle} actions={actions}>
      <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,.txt,image/jpeg,image/png,application/pdf" onChange={onFile} />
      <div data-testid="documents-panel" style={{ display: 'grid', gap: 10 }}>
        {docs.length === 0 && <p className="gb-meta-row">No documents yet.</p>}
        {docs.map((d) => (
          <div
            key={d.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-raised, rgba(255,255,255,0.04))' }}
          >
            <FileText size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-body)' }}>
                {d.title}
                {!stepKey && (
                  <span className="gb-meta-row" style={{ marginLeft: 8, fontSize: 12 }}>· {d.step_label ?? 'General'}</span>
                )}
              </div>
              <div className="gb-meta-row" style={{ fontSize: 12 }}>
                {d.current.filename} · {formatFileSize(d.current.size_bytes)} · v{d.current.version_no} · {formatDateTime(d.current.uploaded_at)} by {d.current.uploaded_by}
              </div>
            </div>
            <a href={downloadHref(d.current.versionId)} className="gb-btn gb-btn--secondary" download style={{ flexShrink: 0 }}>
              <Download size={15} /> Download
            </a>
            <Button variant="secondary" disabled={busy} onClick={() => pick(d.id)}>New version</Button>
            {d.versionCount > 1 && (
              <IconButton label="Version history" onClick={() => setHistoryFor(d)}>
                <History size={16} />
              </IconButton>
            )}
            <IconButton label="Delete document" onClick={() => setConfirmDelete(d)}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        ))}
      </div>

      {historyFor && <VersionHistoryDialog reference={reference} doc={historyFor} onClose={() => setHistoryFor(null)} />}

      {confirmDelete && (
        <Dialog open title={`Delete ${confirmDelete.title}`} onClose={() => setConfirmDelete(null)}>
          <p>This removes the document and every version, including the stored files. This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" disabled={busy} onClick={() => void remove(confirmDelete)}>Delete document</Button>
          </div>
        </Dialog>
      )}
    </Card>
  )
}

function VersionHistoryDialog({ reference, doc, onClose }: { reference: string; doc: TalentDocument; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['document-versions', reference, doc.id],
    queryFn: () => api.get<{ versions: DocumentVersion[] }>(`/talent/${reference}/documents/${doc.id}/versions`),
  })
  return (
    <Dialog open title={`${doc.title} — version history`} onClose={onClose}>
      <div style={{ display: 'grid', gap: 8 }}>
        {(q.data?.versions ?? []).map((v) => (
          <div key={v.versionId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className="gb-meta-row">
              v{v.version_no} · {v.filename} · {formatFileSize(v.size_bytes)} · {formatDateTime(v.uploaded_at)} by {v.uploaded_by}
            </span>
            <a href={`/api/talent/${reference}/documents/${v.versionId}/file`} className="gb-btn gb-btn--secondary" download>
              <Download size={14} /> Download
            </a>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
