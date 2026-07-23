/**
 * Social & News vocabulary (spec 007). Platforms are a fixed list (FR-001);
 * "other" plus the handle field covers the long tail. Follower counts are
 * manual-first — API sync is a future spec (FR-007) that will update these
 * same records.
 */
export const SOCIAL_PLATFORMS = [
  'linkedin',
  'x',
  'instagram',
  'tiktok',
  'youtube',
  'facebook',
  'website',
  'other',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  website: 'Website',
  other: 'Other',
}

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(value)
}

/** Abbreviate reach figures: 1,234 → 1.2k · 2,500,000 → 2.5m. Precise value kept in data. */
export function formatFollowers(n: number | null | undefined): string {
  if (n == null) return 'Not counted'
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const k = Math.round((n / 1000) * 10) / 10
    return `${k >= 100 ? Math.round(k) : k}k`
  }
  const m = Math.round((n / 1_000_000) * 10) / 10
  return `${m}m`
}

/** https-only link check (FR-001) — factual message lives at the schema layer. */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}
