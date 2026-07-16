import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TALENT_STATUS,
  TALENT_STATUSES,
  TALENT_STATUS_LABELS,
  TALENT_STATUS_TONES,
  isTalentStatus,
} from '@shared/enums'

describe('talent status vocabulary (FR-005)', () => {
  it('contains exactly the five fixed statuses, in canonical order', () => {
    expect(TALENT_STATUSES).toEqual(['available', 'on_hold', 'booked', 'confirmed', 'cancelled'])
  })

  it('defaults new records to available', () => {
    expect(DEFAULT_TALENT_STATUS).toBe('available')
  })

  it.each(TALENT_STATUSES)('accepts vocabulary value %s', (s) => {
    expect(isTalentStatus(s)).toBe(true)
  })

  it.each(['Available', 'ON_HOLD', 'pending', '', null, undefined, 42])(
    'rejects non-vocabulary value %s',
    (v) => {
      expect(isTalentStatus(v)).toBe(false)
    },
  )

  it('has a sentence-case label for every status (spec fixed set)', () => {
    expect(TALENT_STATUS_LABELS).toEqual({
      available: 'Available',
      on_hold: 'On hold',
      booked: 'Booked',
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
    })
  })

  it('maps badge tones per the design system (green/amber/blue/red)', () => {
    expect(TALENT_STATUS_TONES.available).toBe('success')
    expect(TALENT_STATUS_TONES.on_hold).toBe('warning')
    expect(TALENT_STATUS_TONES.booked).toBe('info')
    expect(TALENT_STATUS_TONES.confirmed).toBe('info')
    expect(TALENT_STATUS_TONES.cancelled).toBe('danger')
  })
})
