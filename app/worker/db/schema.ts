import { sql } from 'drizzle-orm'
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { TALENT_STATUSES } from '../../shared/enums'

export const talent = sqliteTable(
  'talent',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reference: text('reference').notNull(),
    name: text('name').notNull(),
    headline: text('headline'),
    biography: text('biography'),
    dayRatePence: integer('day_rate_pence'),
    location: text('location'),
    email: text('email'),
    phone: text('phone'),
    status: text('status').notNull().default('available'),
    archivedAt: text('archived_at'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
    updatedAt: text('updated_at').notNull(),
    updatedBy: text('updated_by').notNull(),
  },
  (t) => [
    uniqueIndex('talent_reference_idx').on(t.reference),
    index('talent_name_idx').on(t.name),
    index('talent_status_idx').on(t.status),
    index('talent_archived_idx').on(t.archivedAt),
    index('talent_day_rate_idx').on(t.dayRatePence),
    check('talent_status_check', sql.raw(`status IN (${TALENT_STATUSES.map((s) => `'${s}'`).join(', ')})`)),
    check('talent_day_rate_check', sql`day_rate_pence IS NULL OR day_rate_pence >= 0`),
  ],
)

export const talentPhoto = sqliteTable(
  'talent_photo',
  {
    id: text('id').primaryKey(),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    r2KeyOriginal: text('r2_key_original').notNull(),
    r2KeyDisplay: text('r2_key_display').notNull(),
    contentType: text('content_type').notNull(),
    isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (t) => [index('photo_talent_idx').on(t.talentId)],
)

export const topic = sqliteTable(
  'topic',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (t) => [uniqueIndex('topic_name_idx').on(sql`${t.name} COLLATE NOCASE`)],
)

export const talentTopic = sqliteTable(
  'talent_topic',
  {
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    topicId: integer('topic_id')
      .notNull()
      .references(() => topic.id),
  },
  (t) => [primaryKey({ columns: [t.talentId, t.topicId] }), index('talent_topic_topic_idx').on(t.topicId)],
)

export const brand = sqliteTable(
  'brand',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('brand_slug_idx').on(t.slug)],
)

/** Row exists ⇔ talent is published to that brand (FR-009). */
export const publication = sqliteTable(
  'publication',
  {
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    brandId: integer('brand_id')
      .notNull()
      .references(() => brand.id),
    publishedAt: text('published_at').notNull(),
    publishedBy: text('published_by').notNull(),
  },
  (t) => [primaryKey({ columns: [t.talentId, t.brandId] })],
)

/** Append-only audit trail (FR-004) — no update/delete path exists anywhere. */
export const changeRecord = sqliteTable(
  'change_record',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    field: text('field'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    at: text('at').notNull(),
  },
  (t) => [index('change_talent_idx').on(t.talentId, t.id)],
)

/** Single-row transactional counter for TAL-NNNN references (research R6). */
export const refCounter = sqliteTable('ref_counter', {
  id: integer('id').primaryKey(),
  nextNumber: integer('next_number').notNull(),
})
