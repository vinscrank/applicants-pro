export type VerificationStatus = 'verified' | 'maybe' | 'rejected'

export type Seniority = 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'unknown'

export type PostedWithin = 'any' | '24h' | '7d' | '30d' | '90d'
export type MinStatus = 'all' | 'verified' | 'verified_maybe'
export type SortBy = 'posted_desc' | 'posted_asc' | 'relevance'

export interface SearchPreferences {
  default_locations: string[]
  origins: OfferOrigin[]
  posted_within: PostedWithin
  min_status: MinStatus
  sort_by: SortBy
  require_active_apply: boolean
}

export type WorkMode = 'any' | 'onsite' | 'hybrid' | 'remote'

export interface LocationRule {
  areas: string[]
  work_mode: WorkMode
}

export interface SearchCommand {
  prompt_text: string
  locations: string[]
  location_rules?: LocationRule[]
  require_location: boolean
  posted_within: PostedWithin
  posted_within_days?: number | null
  remote_only_areas?: string[]
  languages: string[]
  require_language: boolean
  allowed_roles: string[]
  require_role_match: boolean
  exclude_patterns: string[]
  title_keywords?: string[]
  require_active_apply: boolean
  exclude_pure_sales: boolean
  exclude_call_center: boolean
}

export type OfferOrigin = 'ats' | 'linkedin' | 'indeed' | 'upwork' | 'website'

export interface JobOffer {
  id: string
  company: string
  role: string
  apply_url: string
  source: string
  origin?: OfferOrigin
  posted_at: string | null
  language_requirement: string | null
  seniority: Seniority
  web_dev_fit?: number
  web_dev_fit_label?: string
  status: VerificationStatus
  status_reason: string
  location: string | null
  verified_at: string
  applied: boolean
  applied_at?: string | null
  application_id?: number | null
  tracker_status?: 'draft' | 'applied' | string | null
  user_dismissed?: boolean
  historical?: boolean
  profile_fit_score?: number
  profile_fit_label?: string
  profile_fit_available?: boolean
  profile_fit_feedback?: string
}

export interface SearchResult {
  id?: number
  command: SearchCommand
  preferences?: SearchPreferences
  searched_at: string
  total_found: number
  verified_count: number
  maybe_count: number
  rejected_count: number
  dismissed_count?: number
  dismissed_applied_count?: number
  dismissed_pending_count?: number
  offers: JobOffer[]
  offer_pool?: JobOffer[]
}

export interface SearchRequest {
  command?: SearchCommand
  preferences_override?: SearchPreferences
  persist?: boolean
}

export interface SearchSummary {
  id: number
  searched_at: string
  total_found: number
  verified_count: number
  maybe_count: number
  rejected_count: number
  prompt_text: string
  locations: string[]
  allowed_roles: string[]
}

export interface DefaultCommand {
  command_text: string
  command: SearchCommand
}

export interface Company {
  id?: number
  name: string
  ats: string
  slug: string
  careers_url: string
  job_count: number
  active: boolean
  source: string
  discovered_at: string | null
  priority: boolean
}

export interface CompanyCreateRequest {
  name: string
  ats: string
  slug: string
  careers_url: string
  active: boolean
  priority?: boolean
}

export interface CompanyUpdateRequest {
  name?: string
  ats?: string
  slug?: string
  careers_url?: string
  active?: boolean
  job_count?: number
  priority?: boolean
}

export type CompanyScanWindow = '24h' | '7d' | '30d' | '90d' | 'any'

export interface ScannedOfferBrief {
  role: string
  posted_at: string | null
  apply_url: string
  location: string | null
  source: string
}

export interface CompanyScanResult {
  company_id?: number
  company_name: string
  careers_url: string
  ats: string
  slug: string
  posted_within: CompanyScanWindow
  posted_within_label: string
  total_jobs: number
  recent_count: number
  unknown_date_count: number
  recent_offers: ScannedOfferBrief[]
  scanned_at: string
}

export interface ScanAllRecentResult {
  posted_within: CompanyScanWindow
  posted_within_label: string
  title_query?: string | null
  companies_scanned: number
  companies_failed: number
  offer_count: number
  offers: RecentCareersOfferRow[]
  scanned_at: string
}

export interface RecentCareersOfferRow {
  company_id?: number
  company_name: string
  role: string
  posted_at: string | null
  apply_url: string
  location: string | null
  source: string
  profile_fit_score?: number
  profile_fit_label?: string
  profile_fit_available?: boolean
  profile_fit_feedback?: string
}

export interface DiscoveryResult {
  scanned: number
  discovered: Company[]
  added: number
  skipped: number
  failed_count: number
}

export const DEFAULT_SEARCH_PREFERENCES: SearchPreferences = {
  default_locations: [],
  origins: [],
  posted_within: 'any',
  min_status: 'all',
  sort_by: 'posted_desc',
  require_active_apply: true,
}

export const EMPTY_COMMAND: SearchCommand = {
  prompt_text: '',
  locations: [],
  location_rules: [],
  require_location: false,
  posted_within: 'any',
  posted_within_days: null,
  remote_only_areas: [],
  languages: [],
  require_language: false,
  allowed_roles: [],
  require_role_match: false,
  exclude_patterns: [],
  title_keywords: [],
  require_active_apply: true,
  exclude_pure_sales: false,
  exclude_call_center: false,
}
