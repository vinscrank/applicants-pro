import type { JobOffer } from './types'

export function isCompletedApplication(offer: JobOffer): boolean {
  if (Boolean(offer.applied)) return true
  const status = offer.tracker_status
  return Boolean(status && status !== 'draft')
}

export function isPastApplication(offer: JobOffer, highlightOfferId?: string | null): boolean {
  return isCompletedApplication(offer) && highlightOfferId !== offer.id
}

export function formatAppliedAt(dateStr: string | null | undefined): string | null {
  if (!dateStr?.trim()) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return null
  }
}
