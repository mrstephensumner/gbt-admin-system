import { describe, expect, it } from 'vitest'
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  formatFollowers,
  isHttpsUrl,
  isSocialPlatform,
} from '@shared/social'

describe('social platform vocabulary (spec 007 FR-001)', () => {
  it('defines the fixed platform list', () => {
    expect(SOCIAL_PLATFORMS).toEqual([
      'linkedin',
      'x',
      'instagram',
      'tiktok',
      'youtube',
      'facebook',
      'website',
      'other',
    ])
  })

  it.each(SOCIAL_PLATFORMS)('accepts platform %s with a label', (p) => {
    expect(isSocialPlatform(p)).toBe(true)
    expect(SOCIAL_PLATFORM_LABELS[p]).toBeTruthy()
  })

  it.each(['twitter', 'LINKEDIN', '', null])('rejects non-vocabulary value %s', (v) => {
    expect(isSocialPlatform(v)).toBe(false)
  })
})

describe('follower formatting (FR-002, edge case: large counts abbreviated)', () => {
  it.each([
    [null, 'Not counted'],
    [undefined, 'Not counted'],
    [0, '0'],
    [842, '842'],
    [1234, '1.2k'],
    [15600, '15.6k'],
    [125000, '125k'],
    [2_500_000, '2.5m'],
  ] as const)('formats %s as %s', (n, expected) => {
    expect(formatFollowers(n)).toBe(expected)
  })
})

describe('https link check (FR-001)', () => {
  it.each(['https://linkedin.com/in/jane', 'https://example.com'])('accepts %s', (u) => {
    expect(isHttpsUrl(u)).toBe(true)
  })
  it.each(['http://example.com', 'linkedin.com/in/jane', 'ftp://x', 'not a url', ''])('refuses %s', (u) => {
    expect(isHttpsUrl(u)).toBe(false)
  })
})
