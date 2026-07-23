import type { TalentStatus } from '@shared/enums'

export interface TopicRef {
  id: number
  name: string
}

export interface TalentSummary {
  reference: string
  name: string
  headline: string | null
  primaryPhotoUrl: string | null
  topics: TopicRef[]
  day_rate_pence: number | null
  status: TalentStatus
  archived: boolean
  updated_at: string
}

export interface PhotoRef {
  id: string
  url: string
  is_primary: boolean
  sort_order: number
  category: 'headshot' | 'event'
  caption: string | null
}

export interface PublicationState {
  brand: string
  brand_name: string
  published: boolean
  published_at?: string
  published_by?: string
}

export interface Talent {
  reference: string
  name: string
  headline: string | null
  biography: string | null
  day_rate_pence: number | null
  location: string | null
  email: string | null
  phone: string | null
  status: TalentStatus
  archived: boolean
  archived_at: string | null
  topics: TopicRef[]
  photos: PhotoRef[]
  publications: PublicationState[]
  version: number
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export interface ChangeRecordItem {
  id: number
  actor: string
  action: string
  field: string | null
  old_value: string | null
  new_value: string | null
  at: string
}

export type OnboardingStatus = 'not_started' | 'in_progress' | 'complete' | 'not_applicable'

export interface OnboardingStep {
  key: string
  title: string
  descriptor: string
  order: number
  requiredToPublish: boolean
  status: OnboardingStatus
  blocksPublish: boolean
  note?: string | null
  actor?: string
  at?: string
}

export interface FeeSchedule {
  day_rate_pence: number | null
  half_day_rate_pence: number | null
  after_dinner_rate_pence: number | null
  travel_terms: string | null
  fees_vary_by_site: boolean
}

export interface OnboardingData {
  steps: OnboardingStep[]
  progress: { complete: number; applicable: number; percent: number }
  fee: FeeSchedule
}

export interface DocumentVersion {
  versionId: number
  version_no: number
  filename: string
  content_type: string
  size_bytes: number
  uploaded_by: string
  uploaded_at: string
}

export interface TalentDocument {
  id: number
  step_key: string | null
  step_label: string | null
  title: string
  versionCount: number
  current: DocumentVersion
}

export interface DocumentsData {
  documents: TalentDocument[]
}

export interface DirectoryResponse {
  items: TalentSummary[]
  total: number
  page: number
  per_page: number
}

export interface TopicListItem {
  id: number
  name: string
  talent_count: number
}

export interface BrandItem {
  id: number
  slug: string
  name: string
}
