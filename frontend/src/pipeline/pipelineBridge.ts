import { navigate, type AppRoute } from '../router'

export function parseOfferIdFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  for (const part of notes.split(/\s+/)) {
    if (part.startsWith('offer:')) {
      const offerId = part.slice(6).trim()
      if (offerId) return offerId
    }
  }
  return null
}

export function navigateToTracker(options?: {
  applicationId?: number
  sourceFilter?: 'live_jobs'
}) {
  const route: AppRoute = { page: 'candidature' }
  if (options?.applicationId) route.highlightApplicationId = options.applicationId
  if (options?.sourceFilter) route.sourceFilter = options.sourceFilter
  navigate(route, true)
}

export function navigateToJobs(options?: {
  highlightOfferId?: string
  statusFilter?: 'applied'
  trackerApplicationId?: number
}) {
  const route: AppRoute = { page: 'discover', tab: 'search' }
  if (options?.highlightOfferId) route.highlightOfferId = options.highlightOfferId
  if (options?.statusFilter) route.statusFilter = options.statusFilter
  if (options?.trackerApplicationId != null) route.trackerApplicationId = options.trackerApplicationId
  navigate(route)
}

export function openJobPostingAnalyzeInNewTab(offer: { id: string; apply_url: string }) {
  const params = new URLSearchParams()
  params.set('tab', 'url')
  if (offer.apply_url) params.set('url', offer.apply_url)
  params.set('offer', offer.id)
  params.set('auto', '1')
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`
  window.open(`${base}#discover?${params.toString()}`, '_blank', 'noopener,noreferrer')
}
