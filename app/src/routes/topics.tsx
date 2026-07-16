import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Dialog, Input, Select, Table, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import type { TopicListItem } from '../lib/types'

export function TopicsScreen() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => api.get<{ items: TopicListItem[] }>('/topics') })

  const [renaming, setRenaming] = useState<TopicListItem | null>(null)
  const [newName, setNewName] = useState('')
  const [merging, setMerging] = useState<TopicListItem | null>(null)
  const [mergeTarget, setMergeTarget] = useState('')

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['topics'] }),
      queryClient.invalidateQueries({ queryKey: ['directory'] }),
    ])

  const rename = async () => {
    if (!renaming) return
    try {
      await api.post(`/topics/${renaming.id}/rename`, { name: newName.trim() })
      await refresh()
      toast({ tone: 'success', title: 'Topic renamed' })
      setRenaming(null)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not rename topic', message })
    }
  }

  const merge = async () => {
    if (!merging || !mergeTarget) return
    try {
      await api.post(`/topics/${merging.id}/merge`, { into: Number(mergeTarget) })
      await refresh()
      toast({ tone: 'success', title: 'Topics merged' })
      setMerging(null)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not merge topics', message })
    }
  }

  return (
    <div>
      <div className="gb-page-head">
        <h1>Topics</h1>
      </div>
      <Card padded={false}>
        <Table<TopicListItem & Record<string, unknown>>
          columns={[
            { key: 'name', header: 'Topic' },
            { key: 'talent_count', header: 'Speakers', align: 'right' },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <div style={{ display: 'inline-flex', gap: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setRenaming(row)
                      setNewName(row.name)
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMerging(row)
                      setMergeTarget('')
                    }}
                  >
                    Merge
                  </Button>
                </div>
              ),
            },
          ]}
          rows={(topics.data?.items ?? []) as (TopicListItem & Record<string, unknown>)[]}
          empty={<div className="gb-empty">No topics yet — they appear as speakers are tagged.</div>}
        />
      </Card>

      <Dialog
        open={renaming !== null}
        title={`Rename ${renaming?.name ?? ''}`}
        onClose={() => setRenaming(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={() => void rename()}>Rename topic</Button>
          </>
        }
      >
        <Input label="New name" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Dialog>

      <Dialog
        open={merging !== null}
        title={`Merge ${merging?.name ?? ''}`}
        subtitle="Every speaker tagged with this topic moves to the topic you choose. This cannot be split apart afterwards."
        onClose={() => setMerging(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMerging(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={!mergeTarget} onClick={() => void merge()}>
              Merge topics
            </Button>
          </>
        }
      >
        <Select
          label="Merge into"
          value={mergeTarget}
          onChange={(e) => setMergeTarget(e.target.value)}
          options={[
            { value: '', label: 'Choose a topic' },
            ...(topics.data?.items
              .filter((t) => t.id !== merging?.id)
              .map((t) => ({ value: String(t.id), label: `${t.name} (${t.talent_count})` })) ?? []),
          ]}
        />
      </Dialog>
    </div>
  )
}
