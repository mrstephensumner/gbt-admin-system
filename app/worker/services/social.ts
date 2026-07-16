import { nowIso } from '../db'
import { ApiError } from '../middleware/errors'
import { getTalentRow } from './serialize'

/**
 * Social & News (spec 007) — manual-first social links with attributed
 * follower stamps, plus press mentions. Link/mention add & remove write
 * change records (FR-005); follower updates are attributed on the row itself.
 */

export interface SocialLinkInput {
  platform: string
  url: string
  handle?: string | null
  followers?: number | null
}

export async function getSocial(d1: D1Database, reference: string) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const [links, mentions, total] = await Promise.all([
    d1
      .prepare(
        'SELECT id, platform, url, handle, followers, followers_set_at, followers_set_by, created_at, created_by FROM talent_social_link WHERE talent_id = ? ORDER BY id',
      )
      .bind(row.id)
      .all(),
    d1
      .prepare(
        'SELECT id, title, outlet, url, published_on, added_at, added_by FROM talent_press_mention WHERE talent_id = ? ORDER BY published_on DESC, id DESC',
      )
      .bind(row.id)
      .all(),
    d1
      .prepare('SELECT COALESCE(SUM(followers), 0) AS n FROM talent_social_link WHERE talent_id = ?')
      .bind(row.id)
      .first<{ n: number }>(),
  ])
  return { links: links.results, mentions: mentions.results, total_followers: total?.n ?? 0 }
}

export async function addSocialLink(d1: D1Database, reference: string, input: SocialLinkInput, actor: string) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const now = nowIso()
  const hasCount = input.followers != null
  await d1.batch([
    d1
      .prepare(
        `INSERT INTO talent_social_link (talent_id, platform, url, handle, followers, followers_set_at, followers_set_by, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        row.id,
        input.platform,
        input.url,
        input.handle ?? null,
        input.followers ?? null,
        hasCount ? now : null,
        hasCount ? actor : null,
        now,
        actor,
      ),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'social_link_added', 'social', NULL, ?, ?)`,
      )
      .bind(row.id, actor, input.platform, now),
  ])
  const created = await d1
    .prepare('SELECT * FROM talent_social_link WHERE talent_id = ? ORDER BY id DESC LIMIT 1')
    .bind(row.id)
    .first()
  return created
}

export async function updateSocialLink(
  d1: D1Database,
  id: number,
  input: { followers?: number | null; url?: string; handle?: string | null },
  actor: string,
) {
  const link = await d1
    .prepare('SELECT * FROM talent_social_link WHERE id = ?')
    .bind(id)
    .first<{ id: number; url: string; handle: string | null }>()
  if (!link) throw new ApiError(404, 'not_found', 'No such social profile')

  const now = nowIso()
  if (input.followers !== undefined) {
    // Restamp semantics (FR-002): every count update refreshes as-of + who
    await d1
      .prepare('UPDATE talent_social_link SET followers = ?, followers_set_at = ?, followers_set_by = ? WHERE id = ?')
      .bind(input.followers, input.followers == null ? null : now, input.followers == null ? null : actor, id)
      .run()
  }
  if (input.url !== undefined || input.handle !== undefined) {
    await d1
      .prepare('UPDATE talent_social_link SET url = ?, handle = ? WHERE id = ?')
      .bind(input.url ?? link.url, input.handle !== undefined ? input.handle : link.handle, id)
      .run()
  }
  return d1.prepare('SELECT * FROM talent_social_link WHERE id = ?').bind(id).first()
}

export async function removeSocialLink(d1: D1Database, id: number, actor: string) {
  const link = await d1
    .prepare('SELECT id, talent_id, platform FROM talent_social_link WHERE id = ?')
    .bind(id)
    .first<{ id: number; talent_id: number; platform: string }>()
  if (!link) throw new ApiError(404, 'not_found', 'No such social profile')
  await d1.batch([
    d1.prepare('DELETE FROM talent_social_link WHERE id = ?').bind(id),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'social_link_removed', 'social', ?, NULL, ?)`,
      )
      .bind(link.talent_id, actor, link.platform, nowIso()),
  ])
}

export async function addPressMention(
  d1: D1Database,
  reference: string,
  input: { title: string; outlet: string; url: string; published_on: string },
  actor: string,
) {
  const row = await getTalentRow(d1, reference)
  if (!row) throw new ApiError(404, 'not_found', 'No such talent record')
  const now = nowIso()
  await d1.batch([
    d1
      .prepare(
        `INSERT INTO talent_press_mention (talent_id, title, outlet, url, published_on, added_at, added_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(row.id, input.title, input.outlet, input.url, input.published_on, now, actor),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'press_mention_added', 'press', NULL, ?, ?)`,
      )
      .bind(row.id, actor, input.outlet, now),
  ])
  const created = await d1
    .prepare('SELECT * FROM talent_press_mention WHERE talent_id = ? ORDER BY id DESC LIMIT 1')
    .bind(row.id)
    .first()
  return created
}

export async function removePressMention(d1: D1Database, id: number, actor: string) {
  const mention = await d1
    .prepare('SELECT id, talent_id, outlet FROM talent_press_mention WHERE id = ?')
    .bind(id)
    .first<{ id: number; talent_id: number; outlet: string }>()
  if (!mention) throw new ApiError(404, 'not_found', 'No such press mention')
  await d1.batch([
    d1.prepare('DELETE FROM talent_press_mention WHERE id = ?').bind(id),
    d1
      .prepare(
        `INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
         VALUES (?, ?, 'press_mention_removed', 'press', ?, NULL, ?)`,
      )
      .bind(mention.talent_id, actor, mention.outlet, nowIso()),
  ])
}
