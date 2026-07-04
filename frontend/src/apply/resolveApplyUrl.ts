import type { JobOffer } from '../jobs/types'

const GREENHOUSE_SLUG_OVERRIDES: Record<string, string> = {
  'monday.com': 'mondaydotcom',
  'remote.com': 'remotecom',
  'keeper security': 'keepersecurity',
  'red hat': 'redhat',
}

function greenhouseSlug(company: string): string {
  const key = company.toLowerCase().trim()
  return GREENHOUSE_SLUG_OVERRIDES[key] || key.replace(/[^a-z0-9]/g, '')
}

export function resolveApplyUrl(offer: JobOffer): string {
  const url = offer.apply_url?.trim() || ''
  if (!url) return url
  if (
    offer.origin === 'linkedin' ||
    offer.origin === 'indeed' ||
    offer.origin === 'upwork' ||
    offer.source === 'linkedin' ||
    offer.source === 'indeed' ||
    offer.source === 'upwork'
  ) {
    return url
  }
  if (offer.source !== 'greenhouse') return url
  if (url.includes('greenhouse.io') || url.includes('grnh.se')) {
    if (!url.includes('#')) return `${url.split('#')[0]}#app`
    return url
  }

  const ghJid =
    url.match(/[?&#]gh_jid=(\d+)/)?.[1] ||
    url.match(/\/jobs\/(\d+)/)?.[1]

  if (ghJid) {
    return `https://boards.greenhouse.io/${greenhouseSlug(offer.company)}/jobs/${ghJid}#app`
  }
  return url
}
