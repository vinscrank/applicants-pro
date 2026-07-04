import type { JobOffer, SearchPreferences, VerificationStatus, SearchCommand } from './types'
import { offerRelevanceScore, promptSearchTerms } from './offerPromptRelevance'
import { isCompletedApplication } from './offerApplicationStatus'
import { offerMatchesPromptIntent } from './promptMatch'

function parsePostedAt(value: string | null): Date | null {
  if (!value?.trim()) return null
  const raw = value.trim()
  const iso = Date.parse(raw.replace('Z', '+00:00'))
  if (!Number.isNaN(iso)) return new Date(iso)
  const ymd = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const d = Date.parse(`${ymd}T00:00:00Z`)
    if (!Number.isNaN(d)) return new Date(d)
  }
  return null
}

function statusRank(status: VerificationStatus): number {
  if (status === 'verified') return 0
  if (status === 'maybe') return 1
  return 2
}

function aiRelevanceScore(offer: JobOffer): number {
  if (offer.web_dev_fit != null && offer.web_dev_fit > 0) return offer.web_dev_fit
  return 50
}

function postedCutoff(command?: SearchCommand): Date | null {
  if (!command) return null
  const customDays = command.posted_within_days
  if (customDays != null && customDays > 0) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - customDays)
    return cutoff
  }
  const window = command.posted_within
  if (!window || window === 'any') return null
  const cutoff = new Date()
  if (window === '24h') cutoff.setHours(cutoff.getHours() - 24)
  else if (window === '7d') cutoff.setDate(cutoff.getDate() - 7)
  else if (window === '30d') cutoff.setDate(cutoff.getDate() - 30)
  else if (window === '90d') cutoff.setDate(cutoff.getDate() - 90)
  else return null
  return cutoff
}

function matchesPostedWindow(offer: JobOffer, command?: SearchCommand): boolean {
  const cutoff = postedCutoff(command)
  if (!cutoff) return true
  const posted = parsePostedAt(offer.posted_at ?? null)
  if (!posted) return false
  return posted >= cutoff
}

function matchesPromptIntent(offer: JobOffer): boolean {
  return offerMatchesPromptIntent(offer)
}

function sortOffers(offers: JobOffer[], prefs: SearchPreferences, command?: SearchCommand): JobOffer[] {
  const minDate = new Date(0)
  const dated = (o: JobOffer) => parsePostedAt(o.posted_at) ?? minDate
  const terms = promptSearchTerms(command)

  if (prefs.sort_by === 'posted_asc') {
    return [...offers].sort((a, b) => {
      const da = dated(a).getTime()
      const db = dated(b).getTime()
      if (da !== db) return da - db
      return a.company.localeCompare(b.company)
    })
  }

  if (prefs.sort_by === 'relevance' && terms.length) {
    return [...offers].sort((a, b) => {
      const aiDiff = aiRelevanceScore(b) - aiRelevanceScore(a)
      if (aiDiff !== 0) return aiDiff
      const scoreDiff = offerRelevanceScore(b, terms) - offerRelevanceScore(a, terms)
      if (scoreDiff !== 0) return scoreDiff
      return dated(b).getTime() - dated(a).getTime()
    })
  }

  if (prefs.sort_by === 'relevance') {
    return [...offers].sort((a, b) => {
      const aiDiff = aiRelevanceScore(b) - aiRelevanceScore(a)
      if (aiDiff !== 0) return aiDiff
      const sr = statusRank(a.status) - statusRank(b.status)
      if (sr !== 0) return sr
      return dated(b).getTime() - dated(a).getTime()
    })
  }

  return [...offers].sort((a, b) => dated(b).getTime() - dated(a).getTime())
}

export function applySessionFiltersToOffers(
  pool: JobOffer[],
  prefs: SearchPreferences,
  options?: { command?: SearchCommand },
): JobOffer[] {
  const matched = pool.filter(
    (offer) => matchesPromptIntent(offer) && matchesPostedWindow(offer, options?.command),
  )
  return sortOffers(matched, prefs, options?.command)
}

export function applySessionFiltersSplit(
  pool: JobOffer[],
  prefs: SearchPreferences,
  options?: { command?: SearchCommand },
): { active: JobOffer[]; dismissed: JobOffer[]; combined: JobOffer[] } {
  const dismissed = pool.filter((o) => o.user_dismissed)
  const active = applySessionFiltersToOffers(
    pool.filter((o) => !o.user_dismissed),
    prefs,
    options,
  )
  return { active, dismissed, combined: [...active, ...dismissed] }
}

export function getFilterExcludedOffers(
  pool: JobOffer[],
  _prefs: SearchPreferences,
  _options?: { command?: SearchCommand },
): JobOffer[] {
  return pool.filter((o) => !o.user_dismissed && !matchesPromptIntent(o))
}

export function countOffersByStatus(offers: JobOffer[]) {
  const active = offers.filter((o) => !o.user_dismissed)
  const dismissed = offers.filter((o) => o.user_dismissed)
  const dismissedApplied = dismissed.filter((o) => isCompletedApplication(o)).length
  return {
    total_found: offers.length,
    verified_count: active.filter((o) => o.status === 'verified').length,
    maybe_count: active.filter((o) => o.status === 'maybe').length,
    rejected_count: active.filter((o) => o.status === 'rejected').length,
    dismissed_count: dismissed.length,
    dismissed_applied_count: dismissedApplied,
    dismissed_pending_count: dismissed.length - dismissedApplied,
  }
}

export function splitActiveAndDismissed(offers: JobOffer[]) {
  const active: JobOffer[] = []
  const dismissed: JobOffer[] = []
  for (const offer of offers) {
    if (offer.user_dismissed) dismissed.push(offer)
    else active.push(offer)
  }
  return { active, dismissed }
}
