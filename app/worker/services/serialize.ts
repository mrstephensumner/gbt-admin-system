import type { TalentStatus } from '../../shared/enums'

/** Raw talent row as stored (snake_case, matching the schema). */
export interface TalentRow {
  id: number
  reference: string
  name: string
  headline: string | null
  biography: string | null
  day_rate_pence: number | null
  location: string | null
  email: string | null
  phone: string | null
  status: TalentStatus
  archived_at: string | null
  version: number
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export async function getTalentRow(d1: D1Database, reference: string): Promise<TalentRow | null> {
  return await d1.prepare('SELECT * FROM talent WHERE reference = ?').bind(reference).first<TalentRow>()
}

/** Full record shape per contracts/api.md — internal id never leaves the Worker. */
export async function serializeTalent(d1: D1Database, row: TalentRow) {
  const [topics, photos, pubs, brands] = await Promise.all([
    d1
      .prepare(
        'SELECT t.id, t.name FROM topic t JOIN talent_topic tt ON tt.topic_id = t.id WHERE tt.talent_id = ? ORDER BY t.name COLLATE NOCASE',
      )
      .bind(row.id)
      .all<{ id: number; name: string }>(),
    d1
      .prepare('SELECT id, is_primary, sort_order FROM talent_photo WHERE talent_id = ? ORDER BY sort_order, id')
      .bind(row.id)
      .all<{ id: string; is_primary: number; sort_order: number }>(),
    d1
      .prepare('SELECT brand_id, published_at, published_by FROM publication WHERE talent_id = ?')
      .bind(row.id)
      .all<{ brand_id: number; published_at: string; published_by: string }>(),
    d1.prepare('SELECT id, slug, name FROM brand ORDER BY id').all<{ id: number; slug: string; name: string }>(),
  ])

  const pubByBrand = new Map(pubs.results.map((p) => [p.brand_id, p]))

  return {
    reference: row.reference,
    name: row.name,
    headline: row.headline,
    biography: row.biography,
    day_rate_pence: row.day_rate_pence,
    location: row.location,
    email: row.email,
    phone: row.phone,
    status: row.status,
    archived: row.archived_at !== null,
    archived_at: row.archived_at,
    topics: topics.results,
    photos: photos.results.map((p) => ({
      id: p.id,
      url: `/api/photos/${p.id}?size=display`,
      is_primary: !!p.is_primary,
      sort_order: p.sort_order,
    })),
    publications: brands.results.map((b) => {
      const pub = pubByBrand.get(b.id)
      return {
        brand: b.slug,
        brand_name: b.name,
        published: !!pub,
        ...(pub ? { published_at: pub.published_at, published_by: pub.published_by } : {}),
      }
    }),
    version: row.version,
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
  }
}
