import type { CompanyScanWindow, RecentCareersOfferRow } from '@/jobs/types'

export function filterCareersOffersByRole(
  offers: RecentCareersOfferRow[],
  query: string,
): RecentCareersOfferRow[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return offers
  return offers.filter((offer) => {
    const haystack = `${offer.role} ${offer.company_name}`.toLowerCase()
    return haystack.includes(needle)
  })
}

export function filterCareersOffersByLocation(
  offers: RecentCareersOfferRow[],
  query: string,
): RecentCareersOfferRow[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return offers
  return offers.filter((offer) => (offer.location || '').toLowerCase().includes(needle))
}

export function filterCareersOffers(
  offers: RecentCareersOfferRow[],
  roleQuery: string,
  locationQuery: string,
): RecentCareersOfferRow[] {
  return filterCareersOffersByLocation(
    filterCareersOffersByRole(offers, roleQuery),
    locationQuery,
  )
}

export function filterCareersOffersByCompanyIds(
  offers: RecentCareersOfferRow[],
  companyIds: Set<number>,
): RecentCareersOfferRow[] {
  if (!companyIds.size) return offers
  return offers.filter(
    (offer) => offer.company_id != null && companyIds.has(offer.company_id),
  )
}

function postedWithinCutoff(window: CompanyScanWindow): Date | null {
  if (window === 'any') return null
  const now = Date.now()
  const ms =
    window === '24h' ? 24 * 60 * 60 * 1000
    : window === '7d' ? 7 * 24 * 60 * 60 * 1000
    : window === '30d' ? 30 * 24 * 60 * 60 * 1000
    : 90 * 24 * 60 * 60 * 1000
  return new Date(now - ms)
}

export function filterCareersOffersByPostedWithin(
  offers: RecentCareersOfferRow[],
  window: CompanyScanWindow,
): RecentCareersOfferRow[] {
  const cutoff = postedWithinCutoff(window)
  if (!cutoff) return offers
  return offers.filter((offer) => {
    if (!offer.posted_at) return false
    const posted = new Date(offer.posted_at)
    return !Number.isNaN(posted.getTime()) && posted >= cutoff
  })
}
