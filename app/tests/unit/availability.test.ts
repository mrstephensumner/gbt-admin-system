import { describe, expect, it } from 'vitest'
import {
  AVAILABILITY_STATES,
  AVAILABILITY_TONES,
  buildMonthGrid,
  cellState,
  entryCoversDate,
  isWorkingDay,
  monthBounds,
} from '@shared/availability'

describe('availability vocabulary (spec 012)', () => {
  it('has four states with a tone each', () => {
    expect(AVAILABILITY_STATES).toEqual(['available', 'pencilled', 'confirmed', 'blocked'])
    expect(AVAILABILITY_TONES).toEqual({ available: 'success', pencilled: 'warning', confirmed: 'info', blocked: 'danger' })
  })
})

describe('cellState precedence', () => {
  it('confirmed beats blocked beats pencilled beats available', () => {
    expect(cellState(['available', 'pencilled', 'blocked', 'confirmed'])).toBe('confirmed')
    expect(cellState(['available', 'pencilled', 'blocked'])).toBe('blocked')
    expect(cellState(['available', 'pencilled'])).toBe('pencilled')
    expect(cellState(['available'])).toBe('available')
    expect(cellState([])).toBeNull()
  })
})

describe('entryCoversDate (inclusive range)', () => {
  const e = { start_date: '2026-08-18', end_date: '2026-08-19' }
  it('covers both ends and rejects outside', () => {
    expect(entryCoversDate(e, '2026-08-18')).toBe(true)
    expect(entryCoversDate(e, '2026-08-19')).toBe(true)
    expect(entryCoversDate(e, '2026-08-17')).toBe(false)
    expect(entryCoversDate(e, '2026-08-20')).toBe(false)
  })
  it('covers a mid-range day of a month-spanning entry', () => {
    expect(entryCoversDate({ start_date: '2026-07-30', end_date: '2026-08-03' }, '2026-08-01')).toBe(true)
  })
})

describe('isWorkingDay', () => {
  it('mon_fri excludes Sat/Sun', () => {
    expect(isWorkingDay(4, 'mon_fri')).toBe(true) // Fri
    expect(isWorkingDay(5, 'mon_fri')).toBe(false) // Sat
    expect(isWorkingDay(6, 'mon_fri')).toBe(false) // Sun
  })
  it('mon_sat excludes only Sun; all includes everything', () => {
    expect(isWorkingDay(5, 'mon_sat')).toBe(true)
    expect(isWorkingDay(6, 'mon_sat')).toBe(false)
    expect(isWorkingDay(6, 'all')).toBe(true)
  })
})

describe('buildMonthGrid (Monday-first)', () => {
  it('places August 2026 with the 1st on Saturday and full weeks', () => {
    const weeks = buildMonthGrid(2026, 8)
    // every week has 7 cells
    for (const w of weeks) expect(w).toHaveLength(7)
    // 1 Aug 2026 is a Saturday → weekdayMon0 = 5, in the first week
    const first = weeks[0]!.find((c) => c.date === '2026-08-01')!
    expect(first.weekdayMon0).toBe(5)
    expect(first.inMonth).toBe(true)
    // 31 days all present and inMonth
    const inMonth = weeks.flat().filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(31)
    expect(inMonth[0]!.day).toBe(1)
    expect(inMonth[30]!.day).toBe(31)
  })
  it('leading cells belong to the previous month', () => {
    const weeks = buildMonthGrid(2026, 8)
    expect(weeks[0]!.some((c) => !c.inMonth && c.day > 20)).toBe(true) // late-July leading days
  })
})

describe('monthBounds', () => {
  it('returns first and last day of the month', () => {
    expect(monthBounds('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
    expect(monthBounds('2026-08')).toEqual({ start: '2026-08-01', end: '2026-08-31' })
  })
})
