import { jobsFetch } from '@/jobs/api'
import type { JobOffer, RecentCareersOfferRow } from '@/jobs/types'

interface FitResult {
  profile_fit_score: number
  profile_fit_label: string
  profile_fit_available: boolean
  profile_fit_feedback: string
}

async function fetchProfileFit(
  offers: { company_name: string; role: string; location?: string | null }[],
): Promise<FitResult[]> {
  const data = await jobsFetch<{ offers: FitResult[] }>('/api/jobs/offers/profile-fit', {
    method: 'POST',
    body: JSON.stringify({ offers }),
  })
  return data.offers
}

export async function enrichCareersOffersProfileFit(
  offers: RecentCareersOfferRow[],
): Promise<RecentCareersOfferRow[]> {
  if (!offers.length) return offers
  try {
    const fit = await fetchProfileFit(
      offers.map((o) => ({
        company_name: o.company_name,
        role: o.role,
        location: o.location,
      })),
    )
    return offers.map((offer, i) => ({
      ...offer,
      ...fit[i],
    }))
  } catch {
    return offers
  }
}

export async function enrichJobOffersProfileFit(offers: JobOffer[]): Promise<JobOffer[]> {
  if (!offers.length || !offers.some((o) => !o.profile_fit_available)) return offers
  try {
    const fit = await fetchProfileFit(
      offers.map((o) => ({
        company_name: o.company,
        role: o.role,
        location: o.location,
      })),
    )
    return offers.map((offer, i) => ({
      ...offer,
      ...fit[i],
    }))
  } catch {
    return offers
  }
}
