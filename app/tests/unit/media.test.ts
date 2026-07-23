import { describe, expect, it } from 'vitest'
import { PHOTO_CATEGORIES, isPhotoCategory, videoInfo } from '@shared/media'

describe('photo categories (spec 008 FR-001)', () => {
  it('defines headshot and event', () => {
    expect(PHOTO_CATEGORIES).toEqual(['headshot', 'event'])
  })
  it.each(['headshot', 'event'])('accepts %s', (c) => expect(isPhotoCategory(c)).toBe(true))
  it.each(['portrait', 'HEADSHOT', '', null])('rejects %s', (c) => expect(isPhotoCategory(c)).toBe(false))
})

describe('video provider + thumbnail (FR-003)', () => {
  it('parses youtube watch URLs with a thumbnail', () => {
    expect(videoInfo('https://www.youtube.com/watch?v=abc123')).toEqual({
      provider: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    })
  })
  it('parses youtu.be short URLs', () => {
    expect(videoInfo('https://youtu.be/xyz789')).toEqual({
      provider: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/xyz789/hqdefault.jpg',
    })
  })
  it('recognises vimeo (no thumbnail without an API call)', () => {
    expect(videoInfo('https://vimeo.com/123456')).toEqual({ provider: 'vimeo', thumbnail: null })
  })
  it('falls back to other for unknown hosts and junk', () => {
    expect(videoInfo('https://example.com/reel.mp4')).toEqual({ provider: 'other', thumbnail: null })
    expect(videoInfo('not a url')).toEqual({ provider: 'other', thumbnail: null })
  })
})
