import { nowIso } from '../db'
import type { Env } from '../env'
import { ApiError } from '../middleware/errors'
import { buildPrompt, scanBanned, trigramSimilarity, wordCount, type EnrichmentState } from '../../shared/enrichment'
import { decryptSecret, encryptSecret } from '../lib/crypto'
import { generateBio } from '../lib/anthropic'
import { getTalentRow } from './serialize'

/**
 * Profile Enrichment (spec 013). Org settings (encrypted key), per-site briefs,
 * grounded generation, dual approval, and the publish-safe read. The raw key is
 * never returned; only published bios are publish-safe.
 */

interface SettingsRow {
  key_ciphertext: string | null
  key_iv: string | null
  key_hint: string | null
  model: string
  banned_words: string
  house_style: string | null
}

async function settingsRow(d1: D1Database): Promise<SettingsRow> {
  const row = await d1
    .prepare('SELECT key_ciphertext, key_iv, key_hint, model, banned_words, house_style FROM enrichment_settings WHERE id = 1')
    .first<SettingsRow>()
  return row ?? { key_ciphertext: null, key_iv: null, key_hint: null, model: 'claude-sonnet-5', banned_words: '[]', house_style: null }
}

function bannedList(row: SettingsRow): string[] {
  try {
    const parsed = JSON.parse(row.banned_words)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/** Public settings read — NEVER returns the raw key (FR-001). */
export async function getSettings(d1: D1Database) {
  const row = await settingsRow(d1)
  return {
    configured: !!row.key_ciphertext,
    key_hint: row.key_hint,
    model: row.model,
    banned_words: bannedList(row),
    house_style: row.house_style,
  }
}

export async function setSettings(
  env: Env,
  d1: D1Database,
  input: { api_key?: string; model?: string; banned_words?: string[]; house_style?: string | null },
  actor: string,
) {
  const now = nowIso()
  const sets: string[] = []
  const vals: unknown[] = []
  if (input.api_key !== undefined && input.api_key.trim() !== '') {
    const key = input.api_key.trim()
    const { iv, ciphertext } = await encryptSecret(env, key)
    sets.push('key_ciphertext = ?', 'key_iv = ?', 'key_hint = ?')
    vals.push(ciphertext, iv, key.slice(-4))
  }
  if (input.model !== undefined) {
    sets.push('model = ?')
    vals.push(input.model)
  }
  if (input.banned_words !== undefined) {
    sets.push('banned_words = ?')
    vals.push(JSON.stringify(input.banned_words.map((b) => b.trim()).filter(Boolean)))
  }
  if (input.house_style !== undefined) {
    sets.push('house_style = ?')
    vals.push(input.house_style)
  }
  sets.push('updated_by = ?', 'updated_at = ?')
  vals.push(actor, now)
  await d1.prepare(`UPDATE enrichment_settings SET ${sets.join(', ')} WHERE id = 1`).bind(...vals).run()
  return getSettings(d1)
}

async function decryptedKey(env: Env, d1: D1Database): Promise<string | null> {
  const row = await settingsRow(d1)
  if (!row.key_ciphertext || !row.key_iv) return null
  return decryptSecret(env, row.key_iv, row.key_ciphertext)
}

export async function setSourceMaterial(d1: D1Database, reference: string, material: string | null, actor: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  await d1
    .prepare('UPDATE talent SET source_material = ?, updated_at = ?, updated_by = ? WHERE id = ?')
    .bind(material, nowIso(), actor, t.id)
    .run()
  return { ok: true }
}

interface BioRow {
  id: number
  brand_id: number
  body: string
  state: EnrichmentState
  word_count: number
  similarity: number
  model: string | null
  admin_approved_by: string | null
  admin_approved_at: string | null
  talent_approved_by: string | null
  talent_approved_at: string | null
  published_at: string | null
  updated_at: string
}

async function talentFacts(d1: D1Database, talentId: number) {
  const topics = await d1
    .prepare('SELECT t.name FROM topic t JOIN talent_topic tt ON tt.topic_id = t.id WHERE tt.talent_id = ? ORDER BY t.name COLLATE NOCASE')
    .bind(talentId)
    .all<{ name: string }>()
  return topics.results.map((r) => r.name)
}

export async function getEnrichment(d1: D1Database, reference: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  const settings = await settingsRow(d1)
  const banned = bannedList(settings)

  const [brands, bios] = await Promise.all([
    d1
      .prepare(
        `SELECT b.id, b.slug, b.name, EXISTS (SELECT 1 FROM publication p WHERE p.brand_id = b.id AND p.talent_id = ?) AS published_here
         FROM brand b WHERE b.active = 1 ORDER BY b.sort_order, b.id`,
      )
      .bind(t.id)
      .all<{ id: number; slug: string; name: string; published_here: number }>(),
    d1.prepare('SELECT * FROM talent_site_bio WHERE talent_id = ?').bind(t.id).all<BioRow>(),
  ])
  const bioByBrand = new Map(bios.results.map((b) => [b.brand_id, b]))

  return {
    master_bio_present: !!(t.biography && t.biography.trim() !== ''),
    source_material: t.source_material,
    settings_ready: !!settings.key_ciphertext,
    sites: brands.results.map((b) => {
      const bio = bioByBrand.get(b.id)
      return {
        brand_id: b.id,
        brand_slug: b.slug,
        brand_name: b.name,
        published_here: !!b.published_here,
        incomplete: !!b.published_here && (!bio || bio.state !== 'published'),
        bio: bio
          ? {
              id: bio.id,
              state: bio.state,
              body: bio.body,
              word_count: bio.word_count,
              similarity: bio.similarity,
              banned_hits: scanBanned(bio.body, banned),
              model: bio.model,
              admin_approved_by: bio.admin_approved_by,
              talent_approved_by: bio.talent_approved_by,
              published_at: bio.published_at,
              updated_at: bio.updated_at,
            }
          : null,
      }
    }),
  }
}

async function requireBrand(d1: D1Database, brandId: number) {
  const brand = await d1
    .prepare('SELECT id, name, brief_audience, brief_tone, brief_wordmin, brief_wordmax, brief_include, brief_exclude FROM brand WHERE id = ?')
    .bind(brandId)
    .first<{ id: number; name: string; brief_audience: string | null; brief_tone: string | null; brief_wordmin: number | null; brief_wordmax: number | null; brief_include: string | null; brief_exclude: string | null }>()
  if (!brand) throw new ApiError(404, 'not_found', 'No such site')
  return brand
}

async function change(d1: D1Database, talentId: number, actor: string, action: string, field: string) {
  await d1
    .prepare(`INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at) VALUES (?, ?, ?, ?, NULL, ?, ?)`)
    .bind(talentId, actor, action, field, field, nowIso())
    .run()
}

export async function generate(env: Env, d1: D1Database, reference: string, brandId: number, actor: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  if (!t.biography || t.biography.trim() === '') throw new ApiError(422, 'no_master_bio', 'Add a master biography before generating')
  const apiKey = await decryptedKey(env, d1)
  if (!apiKey) throw new ApiError(409, 'not_configured', 'Configure the Anthropic API key in AI enrichment settings first')
  const settings = await settingsRow(d1)
  const brand = await requireBrand(d1, brandId)
  const topics = await talentFacts(d1, t.id)

  const { system, user } = buildPrompt({
    name: t.name,
    headline: t.headline,
    masterBio: t.biography,
    topics,
    sourceMaterial: t.source_material,
    brief: {
      audience: brand.brief_audience,
      tone: brand.brief_tone,
      wordMin: brand.brief_wordmin,
      wordMax: brand.brief_wordmax,
      include: brand.brief_include,
      exclude: brand.brief_exclude,
    },
    bannedWords: bannedList(settings),
    houseStyle: settings.house_style,
  })

  const body = await generateBio(apiKey, settings.model, system, user) // throws 502 on failure — nothing stored
  const now = nowIso()
  const similarity = Math.round(trigramSimilarity(body, t.biography) * 100)
  await d1
    .prepare(
      `INSERT INTO talent_site_bio (talent_id, brand_id, body, state, word_count, similarity, model, generated_by, generated_at, updated_by, updated_at)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(talent_id, brand_id) DO UPDATE SET
         body = excluded.body, state = 'draft', word_count = excluded.word_count, similarity = excluded.similarity,
         model = excluded.model, generated_by = excluded.generated_by, generated_at = excluded.generated_at,
         admin_approved_by = NULL, admin_approved_at = NULL, talent_approved_by = NULL, talent_approved_at = NULL, published_at = NULL,
         updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    )
    .bind(t.id, brandId, body, wordCount(body), similarity, settings.model, actor, now, actor, now)
    .run()
  await change(d1, t.id, actor, 'enrichment_generated', brand.name)
  return getEnrichment(d1, reference)
}

async function currentBio(d1: D1Database, talentId: number, brandId: number) {
  const bio = await d1
    .prepare('SELECT id, state FROM talent_site_bio WHERE talent_id = ? AND brand_id = ?')
    .bind(talentId, brandId)
    .first<{ id: number; state: EnrichmentState }>()
  if (!bio) throw new ApiError(404, 'not_found', 'No bio to act on — generate one first')
  return bio
}

export async function editBio(d1: D1Database, reference: string, brandId: number, body: string, actor: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  await currentBio(d1, t.id, brandId)
  const brand = await requireBrand(d1, brandId)
  const now = nowIso()
  await d1
    .prepare(
      `UPDATE talent_site_bio SET body = ?, state = 'draft', word_count = ?, similarity = ?,
        admin_approved_by = NULL, admin_approved_at = NULL, talent_approved_by = NULL, talent_approved_at = NULL, published_at = NULL,
        updated_by = ?, updated_at = ? WHERE talent_id = ? AND brand_id = ?`,
    )
    .bind(body, wordCount(body), Math.round(trigramSimilarity(body, t.biography ?? '') * 100), actor, now, t.id, brandId)
    .run()
  await change(d1, t.id, actor, 'enrichment_edited', brand.name)
  return getEnrichment(d1, reference)
}

export async function approve(d1: D1Database, reference: string, brandId: number, by: 'admin' | 'talent', talentName: string | undefined, actor: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  const bio = await currentBio(d1, t.id, brandId)
  const brand = await requireBrand(d1, brandId)
  const now = nowIso()
  if (by === 'admin') {
    if (bio.state !== 'draft') throw new ApiError(400, 'bad_state', 'This bio is already past admin approval')
    await d1
      .prepare("UPDATE talent_site_bio SET state = 'admin_approved', admin_approved_by = ?, admin_approved_at = ?, updated_by = ?, updated_at = ? WHERE id = ?")
      .bind(actor, now, actor, now, bio.id)
      .run()
    await change(d1, t.id, actor, 'enrichment_admin_approved', brand.name)
  } else {
    if (bio.state !== 'admin_approved') throw new ApiError(400, 'bad_state', 'The admin must approve before the talent')
    if (!talentName || talentName.trim() === '') throw new ApiError(400, 'missing_talent', 'Record who approved on the talent’s behalf')
    await d1
      .prepare("UPDATE talent_site_bio SET state = 'talent_approved', talent_approved_by = ?, talent_approved_at = ?, updated_by = ?, updated_at = ? WHERE id = ?")
      .bind(talentName.trim(), now, actor, now, bio.id)
      .run()
    await change(d1, t.id, actor, 'enrichment_talent_approved', brand.name)
  }
  return getEnrichment(d1, reference)
}

export async function publish(d1: D1Database, reference: string, brandId: number, actor: string) {
  const t = await getTalentRow(d1, reference)
  if (!t) throw new ApiError(404, 'not_found', 'No such talent record')
  const bio = await currentBio(d1, t.id, brandId)
  const brand = await requireBrand(d1, brandId)
  if (bio.state !== 'talent_approved') {
    const missing = bio.state === 'draft' ? 'admin and talent approval' : 'talent approval'
    throw new ApiError(422, 'not_approved', `This bio still needs ${missing} before it can be published`)
  }
  await d1
    .prepare("UPDATE talent_site_bio SET state = 'published', published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?")
    .bind(nowIso(), actor, nowIso(), bio.id)
    .run()
  await change(d1, t.id, actor, 'enrichment_published', brand.name)
  return getEnrichment(d1, reference)
}

/** Publish-safe read (FR-010): ONLY published bios, keyed by site slug. */
export async function publishSafeBios(d1: D1Database, talentId: number) {
  const rows = await d1
    .prepare(
      `SELECT b.slug AS brand_slug, sb.body FROM talent_site_bio sb JOIN brand b ON b.id = sb.brand_id
       WHERE sb.talent_id = ? AND sb.state = 'published'`,
    )
    .bind(talentId)
    .all<{ brand_slug: string; body: string }>()
  return rows.results
}
