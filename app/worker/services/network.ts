import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'

/**
 * Publishing network (spec 009). Sites are brands, now UI-manageable. Slugs
 * are immutable (the future public content API keys on them, ADR 0003).
 * Deactivate, never delete while published — protects integrity and history.
 */
export async function listSites(d1: D1Database) {
  const rows = await d1
    .prepare(
      `SELECT b.id, b.slug, b.name, b.url, b.active, b.sort_order,
              b.brief_audience, b.brief_tone, b.brief_wordmin, b.brief_wordmax, b.brief_include, b.brief_exclude,
              (SELECT COUNT(*) FROM publication p WHERE p.brand_id = b.id) AS published_count
       FROM brand b ORDER BY b.sort_order, b.id`,
    )
    .all<{ id: number; slug: string; name: string; url: string | null; active: number; sort_order: number; published_count: number; brief_audience: string | null; brief_tone: string | null; brief_wordmin: number | null; brief_wordmax: number | null; brief_include: string | null; brief_exclude: string | null }>()
  return {
    items: rows.results.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      url: r.url,
      active: !!r.active,
      published_count: r.published_count,
      brief_audience: r.brief_audience,
      brief_tone: r.brief_tone,
      brief_wordmin: r.brief_wordmin,
      brief_wordmax: r.brief_wordmax,
      brief_include: r.brief_include,
      brief_exclude: r.brief_exclude,
    })),
  }
}

const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function createSite(
  d1: D1Database,
  input: { name: string; slug: string; url?: string | null },
) {
  const slug = input.slug.trim().toLowerCase()
  if (!SLUG_SHAPE.test(slug))
    throw new ApiError(400, 'bad_slug', 'Slugs use lowercase letters, numbers and hyphens')
  const clash = await d1.prepare('SELECT 1 FROM brand WHERE slug = ?').bind(slug).first()
  if (clash) throw new ApiError(409, 'slug_taken', 'A site with that slug already exists')

  const order = await d1.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM brand').first<{ m: number }>()
  await d1
    .prepare('INSERT INTO brand (slug, name, url, active, sort_order, created_at) VALUES (?, ?, ?, 1, ?, ?)')
    .bind(slug, input.name.trim(), input.url ?? null, (order?.m ?? -1) + 1, nowIso())
    .run()
  const created = await d1.prepare('SELECT id FROM brand WHERE slug = ?').bind(slug).first<{ id: number }>()
  return created
}

export async function updateSite(
  d1: D1Database,
  id: number,
  input: {
    name?: string
    url?: string | null
    active?: boolean
    // Editorial brief for AI enrichment (spec 013).
    brief_audience?: string | null
    brief_tone?: string | null
    brief_wordmin?: number | null
    brief_wordmax?: number | null
    brief_include?: string | null
    brief_exclude?: string | null
  },
) {
  const site = await d1.prepare('SELECT id FROM brand WHERE id = ?').bind(id).first()
  if (!site) throw new ApiError(404, 'not_found', 'No such site')
  const sets: string[] = []
  const vals: unknown[] = []
  if (input.name !== undefined) {
    sets.push('name = ?')
    vals.push(input.name.trim())
  }
  if (input.url !== undefined) {
    sets.push('url = ?')
    vals.push(input.url ?? null)
  }
  if (input.active !== undefined) {
    sets.push('active = ?')
    vals.push(input.active ? 1 : 0)
  }
  for (const f of ['brief_audience', 'brief_tone', 'brief_wordmin', 'brief_wordmax', 'brief_include', 'brief_exclude'] as const) {
    if (input[f] !== undefined) {
      sets.push(`${f} = ?`)
      vals.push(input[f] ?? null)
    }
  }
  if (sets.length === 0) return { ok: true }
  await d1.prepare(`UPDATE brand SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run()
  return { ok: true }
}
