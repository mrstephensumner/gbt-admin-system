import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Card, useToast } from '../components'
import { api, ApiClientError } from '../lib/api'
import { poundsToPence } from '../lib/hooks'
import type { Talent } from '../lib/types'
import { emptyTalentForm, TalentFields, validateTalentForm, type TalentFormValues } from './talent-form'

export function TalentNewScreen() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<TalentFormValues>(emptyTalentForm)
  const [errors, setErrors] = useState<ReturnType<typeof validateTalentForm>>({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const nextErrors = validateTalentForm(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const talent = await api.post<Talent>('/talent', {
        name: values.name.trim(),
        headline: values.headline.trim() || null,
        biography: values.biography.trim() || null,
        day_rate_pence: poundsToPence(values.dayRatePounds),
        location: values.location.trim() || null,
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        topics: values.topics,
      })
      await queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast({ tone: 'success', title: 'Speaker added', message: `${talent.name} is ${talent.reference}` })
      navigate(`/talent/${talent.reference}`)
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong'
      toast({ tone: 'danger', title: 'Could not save', message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="gb-page-head">
        <h1>Add speaker</h1>
      </div>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <TalentFields values={values} onChange={setValues} errors={errors} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="secondary" onClick={() => navigate('/speakers')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Add speaker
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
