import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FieldLabel, FieldMsg, Input, Tag, Textarea } from '../components'
import { api } from '../lib/api'
import type { TopicListItem } from '../lib/types'

export interface TalentFormValues {
  name: string
  headline: string
  biography: string
  dayRatePounds: string
  location: string
  email: string
  phone: string
  /** Existing topic ids and/or new names (inline creation — FR-018). */
  topics: (number | string)[]
}

export const emptyTalentForm: TalentFormValues = {
  name: '',
  headline: '',
  biography: '',
  dayRatePounds: '',
  location: '',
  email: '',
  phone: '',
  topics: [],
}

/** Topic picker: choose existing topics or type a new one and press Enter. */
export function TopicPicker({
  value,
  onChange,
  error,
}: {
  value: (number | string)[]
  onChange: (topics: (number | string)[]) => void
  error?: string
}) {
  const [draft, setDraft] = useState('')
  const topics = useQuery({ queryKey: ['topics'], queryFn: () => api.get<{ items: TopicListItem[] }>('/topics') })
  const byId = new Map(topics.data?.items.map((t) => [t.id, t.name]) ?? [])

  const labelFor = (t: number | string) => (typeof t === 'number' ? (byId.get(t) ?? `#${t}`) : t)

  const add = (t: number | string) => {
    const exists = value.some((v) => labelFor(v).toLowerCase() === labelFor(t).toLowerCase())
    if (!exists) onChange([...value, t])
    setDraft('')
  }

  const suggestions = (topics.data?.items ?? []).filter(
    (t) =>
      draft &&
      t.name.toLowerCase().includes(draft.toLowerCase()) &&
      !value.some((v) => labelFor(v).toLowerCase() === t.name.toLowerCase()),
  )

  return (
    <div className="gb-field">
      <FieldLabel>Topics</FieldLabel>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: value.length ? 6 : 0 }}>
        {value.map((t, i) => (
          <Tag key={`${labelFor(t)}-${i}`} onRemove={() => onChange(value.filter((_, j) => j !== i))}>
            {labelFor(t)}
          </Tag>
        ))}
      </div>
      <Input
        placeholder="Type a topic and press Enter"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const match = topics.data?.items.find((t) => t.name.toLowerCase() === draft.trim().toLowerCase())
            if (match) add(match.id)
            else if (draft.trim()) add(draft.trim())
          }
        }}
        aria-label="Add a topic"
      />
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {suggestions.slice(0, 6).map((s) => (
            <button
              key={s.id}
              type="button"
              className="gb-tag"
              style={{ cursor: 'pointer' }}
              onClick={() => add(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      {error && <FieldMsg tone="danger">{error}</FieldMsg>}
    </div>
  )
}

export function TalentFields({
  values,
  onChange,
  errors,
}: {
  values: TalentFormValues
  onChange: (v: TalentFormValues) => void
  errors: Partial<Record<keyof TalentFormValues, string>>
}) {
  const set = <K extends keyof TalentFormValues>(key: K, value: TalentFormValues[K]) =>
    onChange({ ...values, [key]: value })

  return (
    <div className="gb-form-grid">
      <Input label="Full name" value={values.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
      <Input
        label="Headline"
        value={values.headline}
        onChange={(e) => set('headline', e.target.value)}
        error={errors.headline}
        hint="One line, e.g. Former England cricketer turned leadership speaker"
      />
      <div className="gb-form-grid__full">
        <Textarea
          label="Biography"
          rows={6}
          value={values.biography}
          onChange={(e) => set('biography', e.target.value)}
          error={errors.biography}
        />
      </div>
      <Input
        label="Day rate (GBP)"
        inputMode="numeric"
        placeholder="e.g. 4000"
        value={values.dayRatePounds}
        onChange={(e) => set('dayRatePounds', e.target.value)}
        error={errors.dayRatePounds}
        hint="Leave blank if not agreed — publication needs one"
      />
      <Input label="Location" value={values.location} onChange={(e) => set('location', e.target.value)} />
      <Input label="Email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} error={errors.email} />
      <Input label="Phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} />
      <div className="gb-form-grid__full">
        <TopicPicker value={values.topics} onChange={(topics) => set('topics', topics)} error={errors.topics} />
      </div>
    </div>
  )
}

export function validateTalentForm(values: TalentFormValues): Partial<Record<keyof TalentFormValues, string>> {
  const errors: Partial<Record<keyof TalentFormValues, string>> = {}
  if (!values.name.trim()) errors.name = 'Add a name'
  if (values.topics.length === 0) errors.topics = 'Add at least one topic'
  if (values.dayRatePounds && Number.isNaN(Number(values.dayRatePounds.replace(/[£,\s]/g, ''))))
    errors.dayRatePounds = 'Day rate must be a number'
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address'
  return errors
}
