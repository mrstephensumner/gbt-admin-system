import { describe, expect, it } from 'vitest'
import {
  formatCount,
  formatDate,
  formatDateTime,
  formatDayRate,
  formatExactCount,
  formatGbp,
  initials,
} from '@shared/format'

describe('GBP formatting (FR-013)', () => {
  it('renders pounds with £ and thousands separators', () => {
    expect(formatGbp(400_000)).toBe('£4,000')
    expect(formatGbp(41_200_000)).toBe('£412,000')
    expect(formatGbp(99_900)).toBe('£999')
    expect(formatGbp(100)).toBe('£1')
  })

  it('keeps pence only when present', () => {
    expect(formatGbp(400_050)).toBe('£4,000.50')
    expect(formatGbp(101)).toBe('£1.01')
  })

  it('renders "No day rate" for null and zero (edge case: never £0)', () => {
    expect(formatDayRate(null)).toBe('No day rate')
    expect(formatDayRate(undefined)).toBe('No day rate')
    expect(formatDayRate(0)).toBe('No day rate')
    expect(formatDayRate(400_000)).toBe('£4,000')
  })
})

describe('date formatting (FR-013, day-month-year)', () => {
  it('renders 12 Aug 2026 style with no leading zero', () => {
    expect(formatDate('2026-08-12T10:00:00Z')).toBe('12 Aug 2026')
    expect(formatDate('2026-01-05T00:00:00Z')).toBe('5 Jan 2026')
  })

  it('renders date-times with 24-hour clock', () => {
    expect(formatDateTime('2026-08-12T14:30:00Z')).toBe('12 Aug 2026, 14:30')
    expect(formatDateTime('2026-08-12T09:05:00Z')).toBe('12 Aug 2026, 09:05')
  })

  it('returns empty string for invalid input rather than crashing', () => {
    expect(formatDate('not-a-date')).toBe('')
  })
})

describe('counts', () => {
  it('abbreviates KPI counts (1.2k style) but keeps precise table counts', () => {
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1284)).toBe('1.3k')
    expect(formatCount(412_000)).toBe('412k')
    expect(formatExactCount(1284)).toBe('1,284')
    expect(formatExactCount(5000)).toBe('5,000')
  })
})

describe('initials avatar fallback (US1-S4)', () => {
  it('takes first and last initials, uppercased', () => {
    expect(initials('Raj Patel')).toBe('RP')
    expect(initials('amelia jane clarke')).toBe('AC')
    expect(initials('Cher')).toBe('C')
    expect(initials('  ')).toBe('?')
  })
})
