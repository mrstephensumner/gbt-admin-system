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
    // Fee schedule (spec 010). Standard day rate is dayRatePence above (single
    // source, reused not duplicated); these are the additional fee fields.
    halfDayRatePence: integer('half_day_rate_pence'),
    afterDinnerRatePence: integer('after_dinner_rate_pence'),
    travelTerms: text('travel_terms'),
    feesVaryBySite: integer('fees_vary_by_site', { mode: 'boolean' }).notNull().default(false),
    // Availability default working week (spec 012): mon_fri | mon_sat | all (null → mon_fri).
    workingWeek: text('working_week'),
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
    // Non-negativity of half-day/after-dinner rates is enforced at the service/route
    // layer (422 bad_amount) rather than a CHECK, so this stays an additive
    // ADD COLUMN migration on the live talent table (no full-table rebuild).
  ],
)

/**
 * Onboarding step state per speaker (spec 010). Sparse — a row exists only when
 * an ATTESTATION step has been acted on or a step is marked not-applicable.
 * Derived steps (headshots, biography, fee schedule) compute their status from
 * the underlying data and store no row here. There is deliberately NO column for
 * raw PII (passport / bank / DBS numbers) — attestation status only (FR-013).
 */
export const talentOnboardingStep = sqliteTable(
  'talent_onboarding_step',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    stepKey: text('step_key').notNull(),
    status: text('status').notNull(),
    note: text('note'),
    actor: text('actor').notNull(),
    at: text('at').notNull(),
  },
  (t) => [
    uniqueIndex('onboarding_step_talent_key_idx').on(t.talentId, t.stepKey),
    index('onboarding_step_talent_idx').on(t.talentId),
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
    category: text('category').notNull().default('headshot'),
    caption: text('caption'),
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
    url: text('url'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
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

/**
 * Talent documents (spec 011 / ADR 0006). A logical document belonging to a
 * speaker, filed generally (step_key NULL) or against an onboarding attestation
 * step. Files live in the separate `gbt-documents` R2 bucket, never public.
 */
export const talentDocument = sqliteTable(
  'talent_document',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    stepKey: text('step_key'),
    title: text('title').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('document_talent_idx').on(t.talentId)],
)

/** One uploaded file of a document. Current version = highest version_no. */
export const talentDocumentVersion = sqliteTable(
  'talent_document_version',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentId: integer('document_id')
      .notNull()
      .references(() => talentDocument.id),
    versionNo: integer('version_no').notNull(),
    r2Key: text('r2_key').notNull(),
    filename: text('filename').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedBy: text('uploaded_by').notNull(),
    uploadedAt: text('uploaded_at').notNull(),
  },
  (t) => [index('document_version_doc_idx').on(t.documentId)],
)

/**
 * Talent availability (spec 012). All-day dated entries in a fixed state
 * vocabulary (available|pencilled|confirmed|blocked). Internal-only — never
 * published. The month view queries entries overlapping the visible month.
 */
export const talentAvailability = sqliteTable(
  'talent_availability',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    state: text('state').notNull(),
    title: text('title').notNull(),
    detail: text('detail'),
    location: text('location'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').notNull(),
    updatedBy: text('updated_by').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('availability_talent_idx').on(t.talentId),
    index('availability_range_idx').on(t.talentId, t.startDate, t.endDate),
  ],
)

/** Single-row transactional counter for TAL-NNNN references (research R6). */
export const refCounter = sqliteTable('ref_counter', {
  id: integer('id').primaryKey(),
  nextNumber: integer('next_number').notNull(),
})

/** Operator registry — authorization source of truth (spec 002 FR-001/002). */
export const operator = sqliteTable(
  'operator',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    role: text('role').notNull().default('operator'),
    addedAt: text('added_at').notNull(),
    addedBy: text('added_by').notNull(),
  },
  (t) => [
    uniqueIndex('operator_email_idx').on(sql`${t.email} COLLATE NOCASE`),
    check('operator_role_check', sql`role IN ('owner', 'operator')`),
  ],
)

/** Row exists ⇔ permission granted; absence = denied (spec 002 FR-008). */
export const operatorGrant = sqliteTable(
  'operator_grant',
  {
    operatorId: integer('operator_id')
      .notNull()
      .references(() => operator.id),
    permission: text('permission').notNull(),
    grantedAt: text('granted_at').notNull(),
    grantedBy: text('granted_by').notNull(),
  },
  (t) => [primaryKey({ columns: [t.operatorId, t.permission] })],
)

/** Import staging (spec 003) — discardable; keyed by the old system's id (FR-010). */
export const importCandidate = sqliteTable(
  'import_candidate',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourceId: text('source_id').notNull(),
    name: text('name').notNull(),
    headline: text('headline'),
    biography: text('biography'),
    topicsJson: text('topics_json').notNull().default('[]'),
    dayRatePence: integer('day_rate_pence'),
    location: text('location'),
    email: text('email'),
    phone: text('phone'),
    photoUrl: text('photo_url'),
    gapsJson: text('gaps_json').notNull().default('[]'),
    duplicateOf: text('duplicate_of'),
    status: text('status').notNull().default('new'),
    talentReference: text('talent_reference'),
    firstSeenAt: text('first_seen_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    decidedAt: text('decided_at'),
    decidedBy: text('decided_by'),
  },
  (t) => [
    uniqueIndex('import_candidate_source_idx').on(sql`${t.sourceId} COLLATE NOCASE`),
    index('import_candidate_status_idx').on(t.status),
    check('import_candidate_status_check', sql`status IN ('new', 'imported', 'skipped')`),
  ],
)

/** One upload (or dry run) — the Recent transfers history (spec 003 FR-004). */
export const importRun = sqliteTable('import_run', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileName: text('file_name').notNull(),
  operator: text('operator').notNull(),
  at: text('at').notNull(),
  rowsFound: integer('rows_found').notNull(),
  rowsStaged: integer('rows_staged').notNull(),
  rowsProblem: integer('rows_problem').notNull(),
  problemsJson: text('problems_json').notNull().default('[]'),
  dryRun: integer('dry_run', { mode: 'boolean' }).notNull().default(false),
})

/** Internal notes on a talent record (spec 006) — append-only, attributed. */
export const talentNote = sqliteTable(
  'talent_note',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    author: text('author').notNull(),
    body: text('body').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('talent_note_talent_idx').on(t.talentId, t.id)],
)

/** Social profile links with manually-tracked reach (spec 007). */
export const talentSocialLink = sqliteTable(
  'talent_social_link',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    platform: text('platform').notNull(),
    url: text('url').notNull(),
    handle: text('handle'),
    followers: integer('followers'),
    followersSetAt: text('followers_set_at'),
    followersSetBy: text('followers_set_by'),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (t) => [index('social_link_talent_idx').on(t.talentId)],
)

/** Press & news mentions (spec 007) — listed newest-first by published_on. */
export const talentPressMention = sqliteTable(
  'talent_press_mention',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    title: text('title').notNull(),
    outlet: text('outlet').notNull(),
    url: text('url').notNull(),
    publishedOn: text('published_on').notNull(),
    addedAt: text('added_at').notNull(),
    addedBy: text('added_by').notNull(),
  },
  (t) => [index('press_mention_talent_idx').on(t.talentId, t.publishedOn)],
)

/** Showreel video links (spec 008) — externally hosted (FR-007). */
export const talentShowreel = sqliteTable(
  'talent_showreel',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    talentId: integer('talent_id')
      .notNull()
      .references(() => talent.id),
    title: text('title'),
    url: text('url').notNull(),
    provider: text('provider').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    createdBy: text('created_by').notNull(),
  },
  (t) => [index('showreel_talent_idx').on(t.talentId)],
)

/** Per-talent SEO metadata (spec 008) — one row per talent, upserted. */
export const talentSeo = sqliteTable('talent_seo', {
  talentId: integer('talent_id')
    .primaryKey()
    .references(() => talent.id),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  focusKeyword: text('focus_keyword'),
  updatedAt: text('updated_at').notNull(),
  updatedBy: text('updated_by').notNull(),
})

/** Append-only team audit trail (spec 002 FR-010) — no update/delete path exists. */
export const operatorAudit = sqliteTable(
  'operator_audit',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    actor: text('actor').notNull(),
    subjectEmail: text('subject_email').notNull(),
    action: text('action').notNull(),
    detail: text('detail'),
    at: text('at').notNull(),
  },
  (t) => [index('operator_audit_at_idx').on(t.id)],
)
