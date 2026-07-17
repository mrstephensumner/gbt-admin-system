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
              (SELECT COUNT(*) FROM publication p WHERE p.brand_id = b.id) AS published_count
       FROM brand b ORDER BY b.sort_order, b.id`,
    )
    .all<{ id: number; slug: string; name: string; url: string | null; active: number; sort_order: number; published_count: number }>()
  return {
    items: rows.results.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      url: r.url,
      active: !!r.active,
      published_count: r.published_count,
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
  input: { name?: string; url?: string | null; active?: boolean },
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
  if (sets.length === 0) return { ok: true }
  await d1.prepare(`UPDATE brand SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run()
  return { ok: true }
}
