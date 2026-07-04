export const ORIGIN_FILTER_OPTIONS: { value: 'linkedin' | 'ats'; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'ats', label: 'Career site' },
]

export type DisplayOfferOrigin = 'linkedin' | 'ats' | 'indeed' | 'upwork' | 'website'

export function resolveOfferOrigin(offer: Pick<{ origin?: string | null; source?: string }, 'origin' | 'source'>): DisplayOfferOrigin {
  if (offer.origin === 'linkedin') return 'linkedin'
  if (offer.origin === 'indeed' || offer.origin === 'upwork' || offer.origin === 'website') return offer.origin
  if (offer.source === 'linkedin') return 'linkedin'
  if (offer.source === 'indeed' || offer.source === 'upwork') return offer.source
  if (offer.source === 'website') return 'website'
  return 'ats'
}

export function offerOriginLabelFromValue(origin: DisplayOfferOrigin, source?: string): string {
  const match = ORIGIN_FILTER_OPTIONS.find((o) => o.value === origin)
  if (match) return match.label
  if (origin === 'indeed') return 'Indeed'
  if (origin === 'upwork') return 'Upwork'
  if (origin === 'website') return 'Sito aziendale'
  const atsLabels: Record<string, string> = {
    greenhouse: 'Greenhouse',
    lever: 'Lever',
    workable: 'Workable',
    ashby: 'Ashby',
  }
  return atsLabels[source || ''] || 'Career site'
}
