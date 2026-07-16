/**
 * Fee bands are DERIVED from the day rate — never stored, never manually
 * assigned (FR-019, spec clarification 2026-07-16). Thresholds are fixed here
 * and nowhere else.
 */

export const FEE_BANDS = ['under_1k', '1k_3k', '3k_5k', '5k_10k', 'over_10k'] as const

export type FeeBand = (typeof FEE_BANDS)[number]

/** `no_rate` is a filter value, not a band: records without a day rate match no band. */
export type FeeBandFilter = FeeBand | 'no_rate'

export const FEE_BAND_LABELS: Record<FeeBandFilter, string> = {
  under_1k: 'Under £1k',
  '1k_3k': '£1k–£3k',
  '3k_5k': '£3k–£5k',
  '5k_10k': '£5k–£10k',
  over_10k: '£10k+',
  no_rate: 'No day rate',
}

/** Inclusive lower bound, exclusive upper bound, in pence. */
export const FEE_BAND_RANGES: Record<FeeBand, { min: number; max: number | null }> = {
  under_1k: { min: 1, max: 100_000 },
  '1k_3k': { min: 100_000, max: 300_000 },
  '3k_5k': { min: 300_000, max: 500_000 },
  '5k_10k': { min: 500_000, max: 1_000_000 },
  over_10k: { min: 1_000_000, max: null },
}

/** Derive the band for a day rate; null/zero → null (no band). */
export function feeBandFor(pence: number | null | undefined): FeeBand | null {
  if (pence == null || pence <= 0) return null
  for (const band of FEE_BANDS) {
    const { min, max } = FEE_BAND_RANGES[band]
    if (pence >= min && (max === null || pence < max)) return band
  }
  return null
}

export function isFeeBandFilter(value: unknown): value is FeeBandFilter {
  return value === 'no_rate' || (typeof value === 'string' && (FEE_BANDS as readonly string[]).includes(value))
}
