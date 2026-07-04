import type { CompanyScanResult, RecentCareersOfferRow } from '@/jobs/types'

export function scanResultsToOffers(scanResults: Record<number, CompanyScanResult>): RecentCareersOfferRow[] {
  const rows: RecentCareersOfferRow[] = []
  for (const scan of Object.values(scanResults)) {
    for (const offer of scan.recent_offers) {
      rows.push({
        company_id: scan.company_id,
        company_name: scan.company_name,
        role: offer.role,
        posted_at: offer.posted_at,
        apply_url: offer.apply_url,
        location: offer.location,
        source: offer.source,
      })
    }
  }
  rows.sort((a, b) => {
    const da = a.posted_at ? new Date(a.posted_at).getTime() : 0
    const db = b.posted_at ? new Date(b.posted_at).getTime() : 0
    return db - da
  })
  return rows
}
