import type { JobOffer } from './types'
import { offerOriginLabelFromValue, resolveOfferOrigin } from './offerOrigin'

const STATUS_LABELS: Record<string, string> = {
  verified: 'verificato',
  maybe: 'da controllare',
  rejected: 'scartato',
}

const SENIORITY_LABELS: Record<string, string> = {
  entry: 'entry',
  junior: 'junior',
  mid: 'mid',
  senior: 'senior',
  lead: 'lead',
  unknown: 'n/d',
}

function offerSearchHaystack(offer: JobOffer): string {
  const origin = resolveOfferOrigin(offer)
  const parts = [
    offer.company,
    offer.role,
    offer.location,
    offer.source,
    origin,
    offerOriginLabelFromValue(origin, offer.source),
    offer.posted_at,
    offer.language_requirement,
    offer.seniority,
    SENIORITY_LABELS[offer.seniority],
    offer.status,
    STATUS_LABELS[offer.status],
    offer.status_reason,
    offer.apply_url,
    offer.user_dismissed ? 'scartato da te' : '',
    offer.applied || offer.tracker_status === 'applied' ? 'già inviata candidato' : '',
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

export function matchesOfferListSearch(offer: JobOffer, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = offerSearchHaystack(offer)
  return q.split(/\s+/).every((term) => haystack.includes(term))
}
