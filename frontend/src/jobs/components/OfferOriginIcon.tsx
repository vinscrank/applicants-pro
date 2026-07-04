import type { OfferOrigin } from '../types'
import { offerOriginLabelFromValue, resolveOfferOrigin } from '../offerOrigin'

const ATS_LABELS: Record<string, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  workable: 'Workable',
  ashby: 'Ashby',
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  )
}

function IndeedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 18V6h3.2v1.6h.08C7.76 6.64 8.72 6 10.16 6c2.48 0 4.24 1.68 4.24 4.32V18H11.2v-7.04c0-1.76-.72-2.56-2-2.56-1.12 0-1.84.72-2.16 1.76V18H4zm13.6 0V8.8h3.04V18H17.6zm1.52-10.56a1.76 1.76 0 110-3.52 1.76 1.76 0 010 3.52z"
      />
    </svg>
  )
}

function UpworkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.561 13.158c-1.102 0-2.135-.467-3.074-1.227l-.742-2.115.742-.616c.944-.784 1.977-1.227 3.074-1.227 2.694 0 4.882 2.227 4.882 4.963 0 2.735-2.188 4.962-4.882 4.962-1.102 0-2.135-.467-3.074-1.227l-.742-2.115.742-.616c.944-.784 1.977-1.227 3.074-1.227 1.654 0 2.996-1.373 2.996-3.064 0-1.691-1.342-3.064-2.996-3.064zm-8.299 0c-1.102 0-2.135-.467-3.074-1.227l-.742-2.115.742-.616c.944-.784 1.977-1.227 3.074-1.227 2.694 0 4.882 2.227 4.882 4.963 0 2.735-2.188 4.962-4.882 4.962-1.102 0-2.135-.467-3.074-1.227l-.742-2.115.742-.616c.944-.784 1.977-1.227 3.074-1.227 1.654 0 2.996-1.373 2.996-3.064 0-1.691-1.342-3.064-2.996-3.064z"
      />
    </svg>
  )
}

function AtsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h10M7 12h6" />
    </svg>
  )
}

export function OriginGlyph({ origin }: { origin: OfferOrigin }) {
  if (origin === 'linkedin') return <LinkedInIcon />
  if (origin === 'indeed') return <IndeedIcon />
  if (origin === 'upwork') return <UpworkIcon />
  if (origin === 'website') return <AtsIcon />
  return <AtsIcon />
}

export function offerOriginLabel(offer: { origin?: OfferOrigin | string | null; source?: string }): string {
  const origin = resolveOfferOrigin(offer)
  if (origin === 'ats' && offer.source && ATS_LABELS[offer.source]) {
    return ATS_LABELS[offer.source]
  }
  return offerOriginLabelFromValue(origin, offer.source)
}

interface Props {
  offer: { origin?: OfferOrigin | string | null; source?: string; apply_url?: string }
  compact?: boolean
}

export function OfferOriginIcon({ offer, compact = false }: Props) {
  const origin = resolveOfferOrigin(offer)
  const label = offerOriginLabel(offer)
  const className = `offer-origin-icon offer-origin-${origin}${compact ? ' offer-origin-icon-compact' : ''}`

  const content = compact ? (
    <span className={className} title={label}>
      <OriginGlyph origin={origin} />
    </span>
  ) : (
    <span className={className} title={label}>
      <OriginGlyph origin={origin} />
      <span className="offer-origin-label">{label}</span>
    </span>
  )

  if (offer.apply_url) {
    return (
      <a
        href={offer.apply_url}
        target="_blank"
        rel="noreferrer"
        className="offer-origin-link"
        title={label}
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </a>
    )
  }

  return content
}
