import { describe, expect, it } from 'vitest'
import { mapHeaders, parseGbpToPence, splitTopics, normalisedRowSchema } from '@shared/importing'

describe('column mapping (R6, FR-002)', () => {
  it('maps mockup-style headers case/punctuation-insensitively', () => {
    const { mapping, unmapped } = mapHeaders(['Talent ID', 'Full Name', 'Bio', 'Day Rate (GBP)', 'Topics', 'Photo URL'])
    expect(mapping.source_id).toBe(0)
    expect(mapping.name).toBe(1)
    expect(mapping.biography).toBe(2)
    expect(mapping.day_rate_raw).toBe(3)
    expect(mapping.topics).toBe(4)
    expect(mapping.photo_url).toBe(5)
    expect(unmapped).toEqual([])
  })

  it('reports unknown headers as unmapped (not fatal)', () => {
    const { mapping, unmapped } = mapHeaders(['Name', 'Shoe size', 'Fee'])
    expect(mapping.name).toBe(0)
    expect(mapping.day_rate_raw).toBe(2)
    expect(unmapped).toEqual(['Shoe size'])
  })

  it('takes the first match when synonyms collide', () => {
    const { mapping, unmapped } = mapHeaders(['ID', 'Ref'])
    expect(mapping.source_id).toBe(0)
    expect(unmapped).toEqual(['Ref'])
  })
})

describe('conservative money parsing (R7, FR-015)', () => {
  it.each([
    ['£4,000', 400_000],
    ['4000', 400_000],
    ['4,000.00', 400_000],
    ['£1250.50', 125_050],
    ['£950', 95_000],
  ])('accepts recognised shape %s', (raw, pence) => {
    expect(parseGbpToPence(raw)).toBe(pence)
  })

  it.each(['POA', 'from £2k', '£2,000 - £5,000', '$4000', '4k', '£4,000+', '-500', '£4,0000', ''])(
    'refuses ambiguous shape %s (gap, never a guess)',
    (raw) => {
      expect(parseGbpToPence(raw)).toBeNull()
    },
  )

  it('handles null/undefined as gaps', () => {
    expect(parseGbpToPence(null)).toBeNull()
    expect(parseGbpToPence(undefined)).toBeNull()
  })
})

describe('topics splitting', () => {
  it('splits on semicolons, commas and pipes, trimming blanks', () => {
    expect(splitTopics('AI; Leadership')).toEqual(['AI', 'Leadership'])
    expect(splitTopics('AI, Leadership | Sport')).toEqual(['AI', 'Leadership', 'Sport'])
    expect(splitTopics('  AI  ')).toEqual(['AI'])
    expect(splitTopics('')).toEqual([])
    expect(splitTopics(null)).toEqual([])
  })
})

describe('normalised row schema (FR-002)', () => {
  it('requires source_id and name with factual messages', () => {
    const missingId = normalisedRowSchema.safeParse({ source_id: '', name: 'A' })
    expect(missingId.success).toBe(false)
    expect(missingId.error!.issues[0]!.message).toBe('Row has no talent identifier')
    const missingName = normalisedRowSchema.safeParse({ source_id: 'SPK-1', name: ' ' })
    expect(missingName.success).toBe(false)
    expect(missingName.error!.issues[0]!.message).toBe('Row has no name')
  })

  it('accepts a full row and defaults topics to empty', () => {
    const parsed = normalisedRowSchema.parse({ source_id: 'SPK-0481', name: 'Dr Jane Smith' })
    expect(parsed.topics).toEqual([])
  })
})
