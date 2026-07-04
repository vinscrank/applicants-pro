import type { JobOffer, RecentCareersOfferRow } from '@/jobs/types'
import { profileFitSortScore } from '@/jobs/profileFit'

export interface TopMatchEntry {
  id: string
  company: string
  role: string
  apply_url: string
  location: string | null
  source: 'search' | 'careers'
  profile_fit_score?: number
  profile_fit_label?: string
  profile_fit_available?: boolean
  profile_fit_feedback?: string
  posted_at?: string | null
}

const STORAGE_KEY = 'discover_top_matches_v1'
const MAX_ENTRIES = 40

function careersRowKey(offer: RecentCareersOfferRow): string {
  return `${offer.company_id ?? 0}:${offer.apply_url}:${offer.role}`
}

function jobOfferKey(offer: JobOffer): string {
  return offer.id
}

export function mapCareersToTopMatch(offer: RecentCareersOfferRow): TopMatchEntry {
  return {
    id: careersRowKey(offer),
    company: offer.company_name,
    role: offer.role,
    apply_url: offer.apply_url,
    location: offer.location,
    source: 'careers',
    profile_fit_score: offer.profile_fit_score,
    profile_fit_label: offer.profile_fit_label,
    profile_fit_available: offer.profile_fit_available,
    profile_fit_feedback: offer.profile_fit_feedback,
    posted_at: offer.posted_at,
  }
}

export function mapSearchToTopMatch(offer: JobOffer): TopMatchEntry {
  return {
    id: jobOfferKey(offer),
    company: offer.company,
    role: offer.role,
    apply_url: offer.apply_url,
    location: offer.location,
    source: 'search',
    profile_fit_score: offer.profile_fit_score,
    profile_fit_label: offer.profile_fit_label,
    profile_fit_available: offer.profile_fit_available,
    profile_fit_feedback: offer.profile_fit_feedback,
    posted_at: offer.posted_at,
  }
}

function mergeEntries(existing: TopMatchEntry[], incoming: TopMatchEntry[]): TopMatchEntry[] {
  const map = new Map<string, TopMatchEntry>()
  for (const entry of [...existing, ...incoming]) {
    map.set(entry.id, entry)
  }
  return [...map.values()]
    .sort((a, b) => profileFitSortScore(b) - profileFitSortScore(a))
    .slice(0, MAX_ENTRIES)
}

function readEntries(): TopMatchEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TopMatchEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEntries(entries: TopMatchEntry[]): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function saveTopMatchesFromCareers(offers: RecentCareersOfferRow[]): void {
  if (!offers.length) return
  const incoming = offers.map(mapCareersToTopMatch)
  writeEntries(mergeEntries(readEntries(), incoming))
}

export function saveTopMatchesFromSearch(offers: JobOffer[]): void {
  if (!offers.length) return
  const incoming = offers.map(mapSearchToTopMatch)
  writeEntries(mergeEntries(readEntries(), incoming))
}

export function loadTopMatches(limit = 8): TopMatchEntry[] {
  return readEntries().slice(0, limit)
}
