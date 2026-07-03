import type { RemoteType } from '@/types'
import type { JobUrlAnalysis, LiveOfferMatch } from '@/annuncio/types'
import type { ApplicationTrackerMatch } from './trackerMatch'
import { offerteFetch } from '@/offerte/api'
import { markOfferteDismissRestore } from '@/offerte/offerteListSession'
import { publishOfferApplied, publishOfferDismissed } from '@/offerte/offerteSyncChannel'

export function mapAnalysisRemoteType(value: string): RemoteType {
  if (value === 'remote' || value === 'hybrid' || value === 'onsite') return value
  return 'unknown'
}

export function analysisTrackerNotes(analysis: JobUrlAnalysis, applied = false): string {
  const lead = applied ? 'Analisi annuncio · candidatura inviata' : 'Analisi annuncio · bozza'
  const parts = [lead, analysis.review]
  if (analysis.summary) parts.push(analysis.summary)
  return parts.filter(Boolean).join('\n\n')
}

export function dismissOfferIdForAnalysis(analysis: JobUrlAnalysis): string {
  const liveId = analysis.live_offer_matches?.find((match) => !match.dismissed)?.offer_id
  if (liveId) return liveId
  let hash = 0
  for (let i = 0; i < analysis.url.length; i += 1) {
    hash = ((hash << 5) - hash + analysis.url.charCodeAt(i)) | 0
  }
  return `ann${Math.abs(hash).toString(36).slice(0, 9)}`
}

export function isAnalysisDismissed(analysis: JobUrlAnalysis, dismissedLocally = false): boolean {
  return (
    dismissedLocally ||
    Boolean(analysis.user_dismissed) ||
    Boolean(
      analysis.live_offer_matches?.length &&
        analysis.live_offer_matches.every((match) => match.dismissed),
    )
  )
}

export interface TrackAnalyzedUrlResponse {
  application_id: number
  created: boolean
  already_applied: boolean
  tracker_match?: ApplicationTrackerMatch | null
  live_offer_matches?: LiveOfferMatch[]
}

export async function analyzeJobUrl(url: string): Promise<JobUrlAnalysis> {
  return offerteFetch<JobUrlAnalysis>('/api/offerte/analyze-url', {
    method: 'POST',
    body: JSON.stringify({ url: url.trim() }),
  })
}

export async function trackAnalyzedJobUrl(
  analysis: JobUrlAnalysis,
  options: { allowDuplicate?: boolean; notes?: string } = {},
): Promise<TrackAnalyzedUrlResponse> {
  return offerteFetch<TrackAnalyzedUrlResponse>('/api/offerte/analyze-url/track', {
    method: 'POST',
    body: JSON.stringify({
      url: analysis.url,
      company: analysis.company.trim(),
      role: analysis.role.trim(),
      location: analysis.location.trim(),
      application_method: analysis.application_method,
      remote_type: mapAnalysisRemoteType(analysis.remote_type),
      notes: options.notes ?? analysisTrackerNotes(analysis, true),
      allow_duplicate: options.allowDuplicate ?? false,
    }),
  })
}

export function publishAnalysisAppliedSync(
  analysis: JobUrlAnalysis,
  sourceOfferId: string | null,
  applicationId: number,
  liveMatches: LiveOfferMatch[] | undefined,
) {
  const liveIds = (liveMatches ?? []).map((match) => match.offer_id)
  const offerIds = [...new Set([sourceOfferId, ...liveIds].filter(Boolean) as string[])]
  publishOfferApplied({
    offerIds,
    applicationId,
    company: analysis.company.trim(),
    role: analysis.role.trim(),
    applyUrl: analysis.url,
    appliedAt: new Date().toISOString(),
  })
}

export async function dismissAnalyzedJobUrl(
  analysis: JobUrlAnalysis,
  sourceOfferId: string | null = null,
): Promise<void> {
  const offerId = dismissOfferIdForAnalysis(analysis)
  await offerteFetch(`/api/offerte/offers/${encodeURIComponent(offerId)}/dismissed`, {
    method: 'PUT',
    body: JSON.stringify({
      dismissed: true,
      apply_url: analysis.url,
      company: analysis.company.trim(),
      role: analysis.role.trim(),
    }),
  })
  markOfferteDismissRestore(offerId)
  const liveIds = (analysis.live_offer_matches ?? []).map((match) => match.offer_id)
  const offerIds = [...new Set([sourceOfferId, offerId, ...liveIds].filter(Boolean) as string[])]
  publishOfferDismissed({
    offerIds,
    company: analysis.company.trim(),
    role: analysis.role.trim(),
    applyUrl: analysis.url,
  })
}
