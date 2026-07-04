import { jobsFetch } from '@/jobs/api'
import type {
  Company,
  CompanyScanResult,
  CompanyScanWindow,
  RecentCareersOfferRow,
} from '@/jobs/types'

export interface ScanProgress {
  current: number
  total: number
  companyName: string
}

export interface UnifiedScanInput {
  keyword: string
  postedWithin: CompanyScanWindow
  selectedCompanyIds: Set<number>
  scannableCompanies: Company[]
  onProgress?: (progress: ScanProgress) => void
}

export interface UnifiedScanMeta {
  keyword: string
  postedWithin: CompanyScanWindow
  scope: 'all' | 'selected'
  selectedCount: number
  companiesScanned: number
  companiesFailed: number
  offerCount: number
  strategy: 'bulk-recent' | 'bulk-search' | 'selected-scan'
}

export interface UnifiedScanResult {
  offers: RecentCareersOfferRow[]
  meta: UnifiedScanMeta
}

function isPartialSelection(selected: Set<number>, total: number): boolean {
  return selected.size > 0 && selected.size < total
}

function rowsFromScanResult(scan: CompanyScanResult, keywordNeedle: string): RecentCareersOfferRow[] {
  const rows: RecentCareersOfferRow[] = []
  for (const offer of scan.recent_offers) {
    const role = offer.role || ''
    if (keywordNeedle && !role.toLowerCase().includes(keywordNeedle)) continue
    rows.push({
      company_id: scan.company_id,
      company_name: scan.company_name,
      role,
      posted_at: offer.posted_at,
      apply_url: offer.apply_url,
      location: offer.location,
      source: offer.source,
    })
  }
  return rows
}

function resolveScanPostedWithin(hasKeyword: boolean, postedWithin: CompanyScanWindow): CompanyScanWindow {
  if (hasKeyword && postedWithin === 'any') return 'any'
  if (hasKeyword) return postedWithin
  if (postedWithin === 'any') return 'any'
  return postedWithin
}

async function scanCompaniesSequentially(
  companies: Company[],
  scanPostedWithin: CompanyScanWindow,
  keywordNeedle: string,
  onProgress?: (progress: ScanProgress) => void,
): Promise<{ offers: RecentCareersOfferRow[]; ok: number; failed: number }> {
  const rows: RecentCareersOfferRow[] = []
  let ok = 0
  let failed = 0
  const total = companies.length

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i]
    if (company.id == null) continue
    onProgress?.({ current: i + 1, total, companyName: company.name })
    try {
      const data = await jobsFetch<CompanyScanResult>(
        `/api/jobs/companies/${company.id}/scan`,
        {
          method: 'POST',
          body: JSON.stringify({ posted_within: scanPostedWithin }),
        },
      )
      rows.push(...rowsFromScanResult(data, keywordNeedle))
      ok++
    } catch {
      failed++
    }
  }

  rows.sort((a, b) => {
    const da = a.posted_at ? new Date(a.posted_at).getTime() : 0
    const db = b.posted_at ? new Date(b.posted_at).getTime() : 0
    return db - da
  })

  return { offers: rows, ok, failed }
}

export async function executeUnifiedCareersScan(
  input: UnifiedScanInput,
): Promise<UnifiedScanResult> {
  const keyword = input.keyword.trim()
  const hasKeyword = keyword.length >= 2
  const keywordNeedle = hasKeyword ? keyword.toLowerCase() : ''
  const total = input.scannableCompanies.length
  const partial = isPartialSelection(input.selectedCompanyIds, total)
  const scope: 'all' | 'selected' = partial ? 'selected' : 'all'

  const targets = partial
    ? input.scannableCompanies.filter(
        (c) => c.id != null && input.selectedCompanyIds.has(c.id),
      )
    : input.scannableCompanies

  const scanPostedWithin = resolveScanPostedWithin(hasKeyword, input.postedWithin)

  const { offers, ok, failed } = await scanCompaniesSequentially(
    targets,
    scanPostedWithin,
    keywordNeedle,
    input.onProgress,
  )

  const strategy: UnifiedScanMeta['strategy'] = partial
    ? 'selected-scan'
    : hasKeyword
      ? 'bulk-search'
      : 'bulk-recent'

  return {
    offers,
    meta: {
      keyword: hasKeyword ? keyword : '',
      postedWithin: input.postedWithin,
      scope,
      selectedCount: targets.length,
      companiesScanned: ok,
      companiesFailed: failed,
      offerCount: offers.length,
      strategy,
    },
  }
}
