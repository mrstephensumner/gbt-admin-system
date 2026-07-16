import { describe, expect, it } from 'vitest'
import { FEE_BANDS, FEE_BAND_LABELS, FEE_BAND_RANGES, feeBandFor, isFeeBandFilter } from '@shared/feeBands'

describe('fee bands derived from day rate (FR-019)', () => {
  it('defines exactly the five fixed bands in ascending order', () => {
    expect(FEE_BANDS).toEqual(['under_1k', '1k_3k', '3k_5k', '5k_10k', 'over_10k'])
  })

  it('derives bands at and around every threshold (boundary sweep)', () => {
    expect(feeBandFor(1)).toBe('under_1k')
    expect(feeBandFor(99_999)).toBe('under_1k')
    expect(feeBandFor(100_000)).toBe('1k_3k') // £1,000 exactly
    expect(feeBandFor(299_999)).toBe('1k_3k')
    expect(feeBandFor(300_000)).toBe('3k_5k') // £3,000 exactly
    expect(feeBandFor(499_999)).toBe('3k_5k')
    expect(feeBandFor(500_000)).toBe('5k_10k') // £5,000 exactly
    expect(feeBandFor(999_999)).toBe('5k_10k')
    expect(feeBandFor(1_000_000)).toBe('over_10k') // £10,000 exactly
    expect(feeBandFor(25_000_000)).toBe('over_10k')
  })

  it('null/zero/negative day rates match no band (edge case: "No day rate")', () => {
    expect(feeBandFor(null)).toBeNull()
    expect(feeBandFor(undefined)).toBeNull()
    expect(feeBandFor(0)).toBeNull()
    expect(feeBandFor(-100)).toBeNull()
  })

  it('ranges are contiguous with no gaps or overlaps', () => {
    for (let i = 0; i < FEE_BANDS.length - 1; i++) {
      expect(FEE_BAND_RANGES[FEE_BANDS[i]!].max).toBe(FEE_BAND_RANGES[FEE_BANDS[i + 1]!].min)
    }
    expect(FEE_BAND_RANGES.over_10k.max).toBeNull()
  })

  it('labels use £ and the fixed wording', () => {
    expect(FEE_BAND_LABELS.under_1k).toBe('Under £1k')
    expect(FEE_BAND_LABELS['1k_3k']).toBe('£1k–£3k')
    expect(FEE_BAND_LABELS.over_10k).toBe('£10k+')
    expect(FEE_BAND_LABELS.no_rate).toBe('No day rate')
  })

  it('accepts band filters including no_rate, rejects junk', () => {
    expect(isFeeBandFilter('3k_5k')).toBe(true)
    expect(isFeeBandFilter('no_rate')).toBe(true)
    expect(isFeeBandFilter('cheap')).toBe(false)
    expect(isFeeBandFilter(3)).toBe(false)
  })
})
