import { describe, expect, it } from 'vitest'
import { formatReference, isReference, normaliseReferenceInput, parseReference } from '@shared/reference'

describe('TAL-NNNN references (FR-002)', () => {
  it('zero-pads to four digits', () => {
    expect(formatReference(1)).toBe('TAL-0001')
    expect(formatReference(481)).toBe('TAL-0481')
    expect(formatReference(9999)).toBe('TAL-9999')
  })

  it('widens naturally past 9999 without truncation', () => {
    expect(formatReference(10000)).toBe('TAL-10000')
    expect(formatReference(123456)).toBe('TAL-123456')
  })

  it('rejects non-positive and non-integer numbers', () => {
    expect(() => formatReference(0)).toThrow()
    expect(() => formatReference(-3)).toThrow()
    expect(() => formatReference(1.5)).toThrow()
  })

  it('round-trips format → parse', () => {
    for (const n of [1, 42, 481, 9999, 10000]) {
      expect(parseReference(formatReference(n))).toBe(n)
    }
  })

  it.each(['TAL-0481', 'TAL-10000'])('recognises valid reference %s', (r) => {
    expect(isReference(r)).toBe(true)
  })

  it.each(['SPK-0481', 'TAL-481', 'TAL-', 'tal-0481', 'TAL-04A1', '', 'TAL 0481'])(
    'rejects malformed reference %s',
    (r) => {
      expect(isReference(r)).toBe(false)
      expect(parseReference(r)).toBeNull()
    },
  )

  it('normalises operator search input to uppercase', () => {
    expect(normaliseReferenceInput(' tal-0481 ')).toBe('TAL-0481')
  })
})
