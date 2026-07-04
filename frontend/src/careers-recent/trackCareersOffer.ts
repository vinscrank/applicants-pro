import type { JobOffer, RecentCareersOfferRow } from '@/jobs/types'
import type { RemoteType } from '@/types'
import { jobsFetch } from '@/jobs/api'
import type { TrackAnalyzedUrlResponse } from '@/applications/jobUrlAnalysis'

function careersDismissOfferId(applyUrl: string): string {
  let hash = 0
  for (let i = 0; i < applyUrl.length; i += 1) {
    hash = ((hash << 5) - hash + applyUrl.charCodeAt(i)) | 0
  }
  return `car${Math.abs(hash).toString(36).slice(0, 9)}`
}

export function careersOfferToJobOffer(offer: RecentCareersOfferRow): JobOffer {
  return {
    id: careersDismissOfferId(offer.apply_url),
    company: offer.company_name,
    role: offer.role,
    apply_url: offer.apply_url,
    source: offer.source,
    location: offer.location,
    posted_at: offer.posted_at,
    language_requirement: null,
    seniority: 'unknown',
    status: 'verified',
    status_reason: '',
    verified_at: '',
    applied: false,
  }
}

function applicationMethodFromSource(source: string): string {
  const key = (source || '').trim().toLowerCase()
  if (key.includes('linkedin')) return 'linkedin'
  if (key.includes('indeed')) return 'indeed'
  return 'company_website'
}

function remoteTypeFromLocation(location: string | null | undefined): RemoteType {
  const value = (location || '').trim().toLowerCase()
  if (value.includes('remote') || value.includes('remoto')) return 'remote'
  if (value.includes('hybrid') || value.includes('ibrid')) return 'hybrid'
  if (value.includes('onsite') || value.includes('on-site') || value.includes('in sede')) return 'onsite'
  return 'unknown'
}

export async function dismissCareersOffer(offer: RecentCareersOfferRow): Promise<void> {
  const applyUrl = (offer.apply_url || '').trim()
  if (!applyUrl) return
  await jobsFetch(`/api/jobs/offers/${encodeURIComponent(careersDismissOfferId(applyUrl))}/dismissed`, {
    method: 'PUT',
    body: JSON.stringify({
      dismissed: true,
      apply_url: applyUrl,
      company: offer.company_name.trim(),
      role: offer.role.trim(),
    }),
  })
}

export function careersOfferRowKey(offer: RecentCareersOfferRow): string {
  return `${offer.company_id ?? 0}:${offer.apply_url}:${offer.role}`
}

export async function trackCareersOffer(
  offer: RecentCareersOfferRow,
  options: { allowDuplicate?: boolean; notes?: string } = {},
): Promise<TrackAnalyzedUrlResponse> {
  const url = (offer.apply_url || '').trim()
  if (!url) throw new Error('missing_apply_url')
  return jobsFetch<TrackAnalyzedUrlResponse>('/api/jobs/analyze-url/track', {
    method: 'POST',
    body: JSON.stringify({
      url,
      company: offer.company_name.trim(),
      role: offer.role.trim(),
      location: (offer.location || '').trim(),
      application_method: applicationMethodFromSource(offer.source),
      remote_type: remoteTypeFromLocation(offer.location),
      notes: options.notes ?? '',
      allow_duplicate: options.allowDuplicate ?? false,
      application_source: 'careers',
    }),
  })
}
