/**
 * Shared Zod schemas — single source of validation for API and UI forms
 * (FR-014/015). Error messages are brief, factual, sentence case, no
 * exclamation marks (Brand & Content Standards).
 */
import { z } from 'zod'
import { TALENT_STATUSES } from './enums'
import { FEE_BANDS } from './feeBands'

const name = z
  .string({ error: 'Add a name' })
  .trim()
  .min(1, 'Add a name')
  .max(200, 'Name must be 200 characters or fewer')

const headline = z.string().trim().max(200, 'Headline must be 200 characters or fewer')
const biography = z.string().trim()
const location = z.string().trim().max(200, 'Location must be 200 characters or fewer')
const email = z.email('Enter a valid email address')
const phone = z.string().trim().max(50, 'Phone must be 50 characters or fewer')

const dayRatePence = z
  .number({ error: 'Day rate must be a number' })
  .int('Day rate must be whole pence')
  .min(0, 'Day rate cannot be negative')

const topicName = z
  .string()
  .trim()
  .min(1, 'Add a topic name')
  .max(60, 'Topic names must be 60 characters or fewer')

/** Topics on a talent record: existing ids and/or new names, at least one overall. */
const topicsInput = z
  .array(z.union([z.number().int().positive(), topicName]))
  .min(1, 'Add at least one topic')

export const talentCreateSchema = z.object({
  name,
  headline: headline.nullish(),
  biography: biography.nullish(),
  day_rate_pence: dayRatePence.nullish(),
  location: location.nullish(),
  email: email.nullish().or(z.literal('').transform(() => null)),
  phone: phone.nullish(),
  topics: topicsInput,
})

export const talentUpdateSchema = z.object({
  version: z.number().int().positive({ error: 'Version is required' }),
  name: name.optional(),
  headline: headline.nullish().optional(),
  biography: biography.nullish().optional(),
  day_rate_pence: dayRatePence.nullish().optional(),
  location: location.nullish().optional(),
  email: email.nullish().or(z.literal('').transform(() => null)).optional(),
  phone: phone.nullish().optional(),
  topics: topicsInput.optional(),
})

export const statusChangeSchema = z.object({
  status: z.enum(TALENT_STATUSES, { error: 'Status must be one of the fixed vocabulary' }),
  version: z.number().int().positive(),
})

export const publicationSchema = z.object({
  brand: z.string().trim().min(1, 'Name the brand'),
  version: z.number().int().positive(),
})

export const versionOnlySchema = z.object({
  version: z.number().int().positive(),
})

export const topicCreateSchema = z.object({ name: topicName })
export const topicRenameSchema = z.object({ name: topicName })
export const topicMergeSchema = z.object({ into: z.number().int().positive() })

export const directoryQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  topic: z.array(z.coerce.number().int().positive()).optional(),
  status: z.array(z.enum(TALENT_STATUSES)).optional(),
  band: z.enum([...FEE_BANDS, 'no_rate']).optional(),
  archived: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(['name', '-name', 'updated_at', '-updated_at', 'day_rate', '-day_rate']).default('name'),
})

export type TalentCreateInput = z.infer<typeof talentCreateSchema>
export type TalentUpdateInput = z.infer<typeof talentUpdateSchema>
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>
