import type { BadgeTone } from './enums'

/**
 * Availability vocabulary & calendar maths (spec 012). Four fixed states
 * (distinct from the talent overall-status vocabulary), a de-emphasis rule for
 * non-working days, and pure Monday-first month-grid helpers. Entries are
 * all-day inclusive date ranges as `YYYY-MM-DD` strings, so plain string
 * comparison is correct and timezone-safe.
 */

export const AVAILABILITY_STATES = ['available', 'pencilled', 'confirmed', 'blocked'] as const
export type AvailabilityState = (typeof AVAILABILITY_STATES)[number]

export const AVAILABILITY_LABELS: Record<AvailabilityState, string> = {
  available: 'Available',
  pencilled: 'Pencilled',
  confirmed: 'Confirmed',
  blocked: 'Blocked',
}

export const AVAILABILITY_TONES: Record<AvailabilityState, BadgeTone> = {
  available: 'success',
  pencilled: 'warning',
  confirmed: 'info',
  blocked: 'danger',
}

export function isAvailabilityState(v: unknown): v is AvailabilityState {
  return typeof v === 'string' && (AVAILABILITY_STATES as readonly string[]).includes(v)
}

/** A firm booking dominates a cell; a block beats a tentative hold; available is lowest. */
export const CELL_PRECEDENCE: AvailabilityState[] = ['confirmed', 'blocked', 'pencilled', 'available']

/** The single state shown on a day cell given the entries covering it (null if none). */
export function cellState(states: AvailabilityState[]): AvailabilityState | null {
  for (const s of CELL_PRECEDENCE) if (states.includes(s)) return s
  return null
}

/** Inclusive range check on ISO date strings. */
export function entryCoversDate(entry: { start_date: string; end_date: string }, iso: string): boolean {
  return entry.start_date <= iso && iso <= entry.end_date
}

export const WORKING_WEEKS = ['mon_fri', 'mon_sat', 'all'] as const
export type WorkingWeek = (typeof WORKING_WEEKS)[number]

export const WORKING_WEEK_LABELS: Record<WorkingWeek, string> = {
  mon_fri: 'Mon–Fri',
  mon_sat: 'Mon–Sat',
  all: 'Every day',
}

export function isWorkingWeek(v: unknown): v is WorkingWeek {
  return typeof v === 'string' && (WORKING_WEEKS as readonly string[]).includes(v)
}

/** weekdayMon0: 0 = Monday … 6 = Sunday. */
export function isWorkingDay(weekdayMon0: number, workingWeek: WorkingWeek): boolean {
  if (workingWeek === 'all') return true
  if (workingWeek === 'mon_sat') return weekdayMon0 <= 5
  return weekdayMon0 <= 4 // mon_fri
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** ISO date string from UTC parts (month is 1-based). */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export interface MonthCell {
  date: string // YYYY-MM-DD
  day: number
  inMonth: boolean
  weekdayMon0: number
}

/**
 * Monday-first weeks covering the given month (month is 1-based). Includes
 * trailing/leading days from adjacent months to fill whole weeks.
 */
export function buildMonthGrid(year: number, month: number): MonthCell[][] {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstWeekdayMon0 = (first.getUTCDay() + 6) % 7 // Sun=0 → 6, Mon=1 → 0
  const start = new Date(Date.UTC(year, month - 1, 1 - firstWeekdayMon0))

  const last = new Date(Date.UTC(year, month, 0)) // day 0 of next month = last day
  const lastWeekdayMon0 = (last.getUTCDay() + 6) % 7
  const totalDays = firstWeekdayMon0 + last.getUTCDate() + (6 - lastWeekdayMon0)

  const weeks: MonthCell[][] = []
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    const cell: MonthCell = {
      date: isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1,
      weekdayMon0: (d.getUTCDay() + 6) % 7,
    }
    if (i % 7 === 0) weeks.push([])
    weeks[weeks.length - 1]!.push(cell)
  }
  return weeks
}

/** First and last ISO dates of a `YYYY-MM` month, for the overlap query. */
export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate()
  return { start: `${month}-01`, end: `${month}-${pad(last)}` }
}
