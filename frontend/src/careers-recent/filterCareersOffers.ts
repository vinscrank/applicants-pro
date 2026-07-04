import type { RecentCareersOfferRow } from '@/jobs/types'

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
