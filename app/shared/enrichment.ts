/**
 * Profile Enrichment vocabulary + pure helpers (spec 013). Similarity and
 * banned-word scanning are dependency-free reviewer signals; the prompt builder
 * enforces grounding, British English and the site brief. No network or secrets
 * here — the Anthropic call lives in worker/lib/anthropic.ts.
 */

export const ENRICHMENT_STATES = ['draft', 'admin_approved', 'talent_approved', 'published'] as const
export type EnrichmentState = (typeof ENRICHMENT_STATES)[number]

export const ENRICHMENT_STATE_LABELS: Record<EnrichmentState, string> = {
  draft: 'Draft',
  admin_approved: 'Admin approved',
  talent_approved: 'Talent approved',
  published: 'Published',
}

export const ENRICHMENT_MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 (highest quality)' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest/cheapest)' },
] as const
export const DEFAULT_ENRICHMENT_MODEL = 'claude-sonnet-5'

export function wordCount(text: string): number {
  const t = text.trim()
  return t === '' ? 0 : t.split(/\s+/).length
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function trigrams(ws: string[]): Set<string> {
  const set = new Set<string>()
  if (ws.length < 3) {
    ws.forEach((w) => set.add(w)) // fall back to unigrams for very short text
    return set
  }
  for (let i = 0; i <= ws.length - 3; i++) set.add(`${ws[i]} ${ws[i + 1]} ${ws[i + 2]}`)
  return set
}

/** Word-trigram Jaccard similarity of two texts, 0–1. Higher = more alike. */
export function trigramSimilarity(a: string, b: string): number {
  const A = trigrams(words(a))
  const B = trigrams(words(b))
  if (A.size === 0 && B.size === 0) return 1
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  const union = A.size + B.size - inter
  return union === 0 ? 0 : inter / union
}

/** Case-insensitive scan for banned words/phrases; returns the matched terms. */
export function scanBanned(text: string, banned: string[]): string[] {
  const lower = text.toLowerCase()
  return banned
    .map((b) => b.trim())
    .filter((b) => b !== '' && lower.includes(b.toLowerCase()))
}

export interface PromptInput {
  name: string
  headline: string | null
  masterBio: string
  topics: string[]
  sourceMaterial: string | null
  brief: {
    audience: string | null
    tone: string | null
    wordMin: number | null
    wordMax: number | null
    include: string | null
    exclude: string | null
  }
  bannedWords: string[]
  houseStyle: string | null
}

/** Build the grounded, on-brand system+user prompt for one site's bio. */
export function buildPrompt(input: PromptInput): { system: string; user: string } {
  const band =
    input.brief.wordMin && input.brief.wordMax
      ? `${input.brief.wordMin}–${input.brief.wordMax} words`
      : 'roughly 120–180 words'

  const system = [
    'You are a professional copywriter for a UK talent agency, writing a speaker biography for one specific website in the agency network.',
    'Write in British English only (e.g. "specialise", "organisation", "programme"). Never use American spellings.',
    'GROUNDING (critical): use ONLY facts present in the SOURCE MATERIAL below. Do NOT invent, infer, or embellish credentials, awards, clients, figures, or claims. If a detail is not in the source, do not state it.',
    'Write in the third person. Do not address the reader. Do not use headings, bullet points, markdown, or a sign-off — return the biography prose only.',
    input.bannedWords.length
      ? `Avoid these clichéd words and phrases entirely: ${input.bannedWords.join(', ')}.`
      : 'Avoid clichéd, obviously-AI phrasing.',
    input.houseStyle ? `House style: ${input.houseStyle}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const user = [
    `TARGET WEBSITE AUDIENCE: ${input.brief.audience ?? 'a general professional booking audience'}`,
    `TONE: ${input.brief.tone ?? 'professional, warm and credible'}`,
    `LENGTH: aim for ${band}.`,
    input.brief.include ? `EMPHASISE: ${input.brief.include}` : '',
    input.brief.exclude ? `AVOID FOR THIS SITE: ${input.brief.exclude}` : '',
    '',
    'SOURCE MATERIAL (the only facts you may use):',
    `Name: ${input.name}`,
    input.headline ? `Headline: ${input.headline}` : '',
    input.topics.length ? `Topics: ${input.topics.join(', ')}` : '',
    `Master biography: ${input.masterBio}`,
    input.sourceMaterial ? `Additional material: ${input.sourceMaterial}` : '',
    '',
    'Write a distinct biography tailored to THIS website’s audience, framing the same facts for that audience. Return the biography prose only.',
  ]
    .filter(Boolean)
    .join('\n')

  return { system, user }
}
