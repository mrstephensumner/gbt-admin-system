import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Card, Input, Select, Textarea, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import type { EnrichmentSettings } from '../lib/types'
import { ENRICHMENT_MODELS } from '@shared/enrichment'

export function EnrichmentSettingsScreen() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const q = useQuery({ queryKey: ['enrichment-settings'], queryFn: () => api.get<EnrichmentSettings>('/enrichment/settings') })
  const data = q.data
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<string | null>(null)
  const [banned, setBanned] = useState<string | null>(null)
  const [houseStyle, setHouseStyle] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!data) return null
  const modelValue = model ?? data.model
  const bannedValue = banned ?? data.banned_words.join('\n')
  const houseValue = houseStyle ?? data.house_style ?? ''

  async function save() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        model: modelValue,
        banned_words: bannedValue.split('\n').map((s) => s.trim()).filter(Boolean),
        house_style: houseValue.trim() === '' ? null : houseValue.trim(),
      }
      if (apiKey.trim() !== '') payload.api_key = apiKey.trim()
      await api.put('/enrichment/settings', payload)
      await queryClient.invalidateQueries({ queryKey: ['enrichment-settings'] })
      setApiKey('')
      setModel(null)
      setBanned(null)
      setHouseStyle(null)
      toast({ tone: 'success', title: 'Settings saved' })
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not save', message: err instanceof ApiClientError ? err.message : 'Something went wrong' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="gb-page-head">
        <h1>AI enrichment settings</h1>
        <p className="gb-meta-row">The organisation&apos;s Anthropic key and house rules that power per-site biography generation. Owner only.</p>
      </div>

      <Card title="Anthropic API key" subtitle={data.configured ? `A key is configured (ends …${data.key_hint}). Enter a new one to replace it.` : 'No key configured yet. Generation is disabled until one is set.'}>
        <Input
          label="API key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={data.configured ? 'Leave blank to keep the current key' : 'sk-ant-…'}
        />
        <p className="gb-meta-row" style={{ fontSize: 12, marginTop: 6 }}>Stored encrypted. It is never shown again or sent to the browser.</p>
      </Card>

      <div style={{ marginTop: 20 }}>
        <Card title="Generation model & house rules">
          <div style={{ display: 'grid', gap: 16 }}>
            <Select label="Model" value={modelValue} options={ENRICHMENT_MODELS.map((m) => ({ value: m.id, label: m.label }))} onChange={(e) => setModel(e.target.value)} />
            <label>
              <span className="gb-field-label">Banned words &amp; phrases (one per line)</span>
              <Textarea value={bannedValue} rows={6} onChange={(e) => setBanned(e.target.value)} placeholder={'delve\nin today’s fast-paced world\ntapestry\nunlock the power'} />
              <span className="gb-meta-row" style={{ fontSize: 12 }}>The clichéd &quot;AI tells&quot; to avoid. Occurrences are flagged in every generated bio.</span>
            </label>
            <label>
              <span className="gb-field-label">House style (optional)</span>
              <Textarea value={houseValue} rows={2} onChange={(e) => setHouseStyle(e.target.value)} placeholder="e.g. Warm and credible; avoid hyperbole; British English throughout." />
            </label>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <Button disabled={saving} onClick={() => void save()}>Save settings</Button>
      </div>
    </div>
  )
}
