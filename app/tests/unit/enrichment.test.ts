import { describe, expect, it } from 'vitest'
import {
  ENRICHMENT_STATES,
  DEFAULT_ENRICHMENT_MODEL,
  buildPrompt,
  scanBanned,
  trigramSimilarity,
  wordCount,
} from '@shared/enrichment'

describe('enrichment vocabulary (spec 013)', () => {
  it('has the four-state machine and a current default model', () => {
    expect(ENRICHMENT_STATES).toEqual(['draft', 'admin_approved', 'talent_approved', 'published'])
    expect(DEFAULT_ENRICHMENT_MODEL).toBe('claude-sonnet-5')
  })
})

describe('wordCount', () => {
  it('counts words, empty is zero', () => {
    expect(wordCount('a tailored biography here')).toBe(4)
    expect(wordCount('   ')).toBe(0)
  })
})

describe('trigramSimilarity', () => {
  it('is 1 for identical, 0 for disjoint, partial in between', () => {
    const a = 'the quick brown fox jumps over the lazy dog'
    expect(trigramSimilarity(a, a)).toBe(1)
    expect(trigramSimilarity('alpha beta gamma delta', 'one two three four five')).toBe(0)
    const partial = trigramSimilarity(a, 'the quick brown cat sleeps under the lazy dog')
    expect(partial).toBeGreaterThan(0)
    expect(partial).toBeLessThan(1)
  })
})

describe('scanBanned', () => {
  it('flags case-insensitive words and phrases, ignores others', () => {
    const text = 'In today’s fast-paced world we delve into a rich tapestry.'
    expect(scanBanned(text, ['delve', 'tapestry', 'in today’s fast-paced world', 'synergy']).sort()).toEqual(
      ['delve', 'in today’s fast-paced world', 'tapestry'].sort(),
    )
    expect(scanBanned('A clean, grounded bio.', ['delve', 'tapestry'])).toEqual([])
  })
})

describe('buildPrompt', () => {
  const input = {
    name: 'Dr Jane Smith',
    headline: 'Leadership speaker',
    masterBio: 'Dr Smith has advised FTSE boards.',
    topics: ['Leadership', 'Change'],
    sourceMaterial: 'MBE 2023',
    brief: { audience: 'Corporate bookers', tone: 'Commercial', wordMin: 120, wordMax: 180, include: 'ROI', exclude: 'after-dinner' },
    bannedWords: ['delve', 'tapestry'],
    houseStyle: 'No hyperbole',
  }

  it('enforces British English, grounding, brief and banned words', () => {
    const { system, user } = buildPrompt(input)
    expect(system).toMatch(/British English/i)
    expect(system).toMatch(/ONLY facts present/i)
    expect(system).toMatch(/delve, tapestry/)
    expect(system).toMatch(/No hyperbole/)
    expect(user).toMatch(/Corporate bookers/)
    expect(user).toMatch(/120–180 words/)
    expect(user).toMatch(/Dr Smith has advised FTSE boards/)
    expect(user).toMatch(/MBE 2023/)
    expect(user).toMatch(/ROI/)
  })

  it('falls back to defaults when the brief is empty', () => {
    const { user } = buildPrompt({ ...input, brief: { audience: null, tone: null, wordMin: null, wordMax: null, include: null, exclude: null } })
    expect(user).toMatch(/120–180 words/) // default band
    expect(user).toMatch(/general professional booking audience/)
  })
})
