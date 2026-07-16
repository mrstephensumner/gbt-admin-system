/**
 * Roster import vocabulary (spec 003) — shared by the browser parser, the
 * Import screen, and the API. Column mapping is tolerant (research R6);
 * money parsing is conservative (R7: a gap beats a guess).
 */
import { z } from 'zod'
import type { BadgeTone } from './enums'

export const CANDIDATE_STATUSES = ['new', 'imported', 'skipped'] as const
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number]

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  new: 'New',
  imported: 'Imported',
  skipped: 'Skipped',
}

export const CANDIDATE_STATUS_TONES: Record<CandidateStatus, BadgeTone> = {
  new: 'info',
  imported: 'success',
  skipped: 'neutral',
}

/** One parsed file row, normalised. Money stays raw here — the server parses it. */
export const normalisedRowSchema = z.object({
  source_id: z.string().trim().min(1, 'Row has no talent identifier'),
  name: z.string().trim().min(1, 'Row has no name').max(200, 'Name must be 200 characters or fewer'),
  headline: z.string().trim().max(200).nullish(),
  biography: z.string().trim().nullish(),
  topics: z.array(z.string().trim().min(1).max(60)).default([]),
  day_rate_raw: z.string().trim().nullish(),
  location: z.string().trim().max(200).nullish(),
  email: z.string().trim().nullish(),
  phone: z.string().trim().max(50).nullish(),
  photo_url: z.string().trim().nullish(),
})

export type NormalisedRow = z.infer<typeof normalisedRowSchema>

/** Header synonyms, matched case/whitespace/punctuation-insensitively (R6). */
const HEADER_SYNONYMS: Record<keyof NormalisedRow | 'topics', string[]> = {
  source_id: ['talent id', 'talentid', 'id', 'ref', 'reference', 'speaker id', 'spk'],
  name: ['name', 'full name', 'speaker', 'speaker name', 'talent name'],
  headline: ['headline', 'tagline', 'title', 'strapline', 'short description'],
  biography: ['biography', 'bio', 'about', 'description', 'profile'],
  topics: ['topics', 'topic', 'categories', 'category', 'tags', 'specialities', 'specialties', 'subjects'],
  day_rate_raw: ['day rate', 'day rate (gbp)', 'fee', 'fees', 'rate', 'rate (gbp)', 'price', 'fee schedule', 'day fee'],
  location: ['location', 'town', 'city', 'region', 'based in', 'base'],
  email: ['email', 'e-mail', 'email address', 'contact email'],
  phone: ['phone', 'telephone', 'mobile', 'phone number', 'contact number'],
  photo_url: ['photo', 'photo url', 'image', 'image url', 'headshot', 'picture', 'avatar'],
}

function canon(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export interface HeaderMapping {
  /** field → column index in the source header row */
  mapping: Partial<Record<keyof NormalisedRow, number>>
  unmapped: string[]
}

export function mapHeaders(headers: string[]): HeaderMapping {
  const mapping: Partial<Record<keyof NormalisedRow, number>> = {}
  const unmapped: string[] = []
  headers.forEach((header, index) => {
    const c = canon(header)
    const field = (Object.keys(HEADER_SYNONYMS) as (keyof NormalisedRow)[]).find((f) =>
      HEADER_SYNONYMS[f].some((syn) => canon(syn) === c),
    )
    if (field !== undefined && mapping[field] === undefined) mapping[field] = index
    else unmapped.push(header)
  })
  return { mapping, unmapped }
}

/** Topics cells may pack several values: "AI; Leadership" / "AI, Leadership" / "AI | Leadership". */
export function splitTopics(cell: string | null | undefined): string[] {
  if (!cell) return []
  return cell
    .split(/[;|,]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/**
 * Conservative GBP parsing (R7, FR-015). Recognised: "£4,000", "4000",
 * "4,000.00", "£1250.50". Anything else (ranges, POA, other currencies,
 * negatives) → null, meaning "gap — reviewer decides".
 */
export function parseGbpToPence(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const m = /^£?\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?$/.exec(trimmed)
  if (!m) return null
  const pounds = Number.parseInt(m[1]!.replace(/,/g, ''), 10)
  const pence = m[2] ? Number.parseInt(m[2], 10) : 0
  return pounds * 100 + pence
}

export const MAX_ROWS_PER_UPLOAD = 10_000
export const MAX_APPROVE_PER_REQUEST = 25
