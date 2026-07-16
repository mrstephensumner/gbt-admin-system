/**
 * UK display formats (FR-013). All money/date rendering flows through here —
 * no ad-hoc toLocaleString calls anywhere else.
 */

/** £4,000 style. Null/zero pence renders the fixed phrase "No day rate". */
export function formatDayRate(pence: number | null | undefined): string {
  if (pence == null || pence === 0) return 'No day rate'
  return formatGbp(pence)
}

/** Integer pence → `£4,000` (whole pounds) or `£4,000.50` when pence are present. */
export function formatGbp(pence: number): string {
  const negative = pence < 0
  const abs = Math.abs(pence)
  const pounds = Math.floor(abs / 100)
  const remainder = abs % 100
  const grouped = pounds.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const body = remainder === 0 ? grouped : `${grouped}.${String(remainder).padStart(2, '0')}`
  return `${negative ? '-' : ''}£${body}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** ISO timestamp/date → `12 Aug 2026` (day-month-year, no leading zero). */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** ISO timestamp → `12 Aug 2026, 14:30` (24-hour, consistent within the admin). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${formatDate(iso)}, ${hh}:${mm}`
}

/** Abbreviate large counts for KPIs: 1,284 → `1.3k` (tables keep precise figures). */
export function formatCount(n: number): string {
  if (n < 1000) return String(n)
  const k = n / 1000
  return `${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}k`
}

/** Thousands-separated precise count for table copy ("Showing 8 of 1,284 speakers"). */
export function formatExactCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Initials for the avatar placeholder (US1-S4): "Raj Patel" → "RP". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]!.charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : ''
  return (first + last).toUpperCase()
}
