/**
 * Media manager vocabulary (spec 008). Photos are categorised; showreels are
 * links to externally-hosted video (FR-007) with provider + thumbnail derived
 * from the URL. SEO metadata mirrors the old site's RankMath fields.
 */
export const PHOTO_CATEGORIES = ['headshot', 'event'] as const
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  headshot: 'Headshots',
  event: 'At events',
}

export function isPhotoCategory(value: unknown): value is PhotoCategory {
  return typeof value === 'string' && (PHOTO_CATEGORIES as readonly string[]).includes(value)
}

export type VideoProvider = 'youtube' | 'vimeo' | 'other'

export interface VideoInfo {
  provider: VideoProvider
  /** Public thumbnail URL where the provider exposes one, else null. */
  thumbnail: string | null
}

/** Derive provider + thumbnail from a showreel URL (FR-003). */
export function videoInfo(url: string): VideoInfo {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { provider: 'other', thumbnail: null }
  }
  const host = parsed.hostname.replace(/^www\./, '')

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = parsed.searchParams.get('v')
    return { provider: 'youtube', thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0]
    return { provider: 'youtube', thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null }
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    // Vimeo thumbnails need an API call; we link out and show a provider badge.
    return { provider: 'vimeo', thumbnail: null }
  }
  return { provider: 'other', thumbnail: null }
}

/** Search-snippet guides (FR-005) — advisory, never blocking. */
export const SEO_LIMITS = { title: 60, description: 160 } as const
