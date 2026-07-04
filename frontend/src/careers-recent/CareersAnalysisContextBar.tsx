import { Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CompanyScanWindow } from '@/jobs/types'
import type { UnifiedScanMeta, ScanProgress } from '@/careers-recent/careersUnifiedScan'
import { cn } from '@/lib/utils'

interface Props {
  scanning: boolean
  scanProgress: ScanProgress | null
  meta: UnifiedScanMeta | null
  filteredCount: number
  roleQuery: string
  locationQuery: string
  smartFilterCount: number
}

function scanWindowLabel(t: (key: string) => string, window: CompanyScanWindow): string {
  if (window === '24h') return t('companies.careers.scanWindow24h')
  if (window === '7d') return t('companies.careers.scanWindow7d')
  if (window === '30d') return t('companies.careers.scanWindow30d')
  if (window === '90d') return t('companies.careers.scanWindow90d')
  return t('careersHub.filters.anyPeriod')
}

export function CareersAnalysisContextBar({
  scanning,
  scanProgress,
  meta,
  filteredCount,
  roleQuery,
  locationQuery,
  smartFilterCount,
}: Props) {
  const { t } = useTranslation()

  let detail = t('careersHub.context.idle')
  let status: 'idle' | 'scanning' | 'done' = 'idle'

  if (scanning) {
    status = 'scanning'
    detail = scanProgress
      ? t('companies.careers.scanBulkProgress', {
          current: scanProgress.current,
          total: scanProgress.total,
          name: scanProgress.companyName,
        })
      : t('careersHub.context.scanning')
  } else if (meta) {
    status = 'done'
    const parts: string[] = []
    if (meta.keyword) {
      parts.push(t('careersHub.context.partKeyword', { keyword: meta.keyword }))
    }
    parts.push(scanWindowLabel(t, meta.postedWithin))
    if (meta.scope === 'selected') {
      parts.push(t('careersHub.context.partSelected', { count: meta.selectedCount }))
    } else {
      parts.push(t('careersHub.context.partAll'))
    }
    parts.push(
      t('careersHub.context.partResults', {
        companies: meta.companiesScanned,
        offers: meta.offerCount,
        filtered: filteredCount,
      }),
    )
    if (meta.companiesFailed > 0) {
      parts.push(t('careersHub.context.partFailed', { failed: meta.companiesFailed }))
    }
    detail = parts.join(' · ')
  }

  const hasClientFilters =
    roleQuery.trim().length > 0
    || locationQuery.trim().length > 0
    || smartFilterCount > 0

  const clientFilterSummary = (() => {
    if (!hasClientFilters) return null
    const parts: string[] = []
    if (roleQuery.trim()) {
      parts.push(t('careersHub.context.clientFilterRole', { value: roleQuery.trim() }))
    }
    if (locationQuery.trim()) {
      parts.push(t('careersHub.context.clientFilterLocation', { value: locationQuery.trim() }))
    }
    if (smartFilterCount > 0) {
      parts.push(t('careersHub.context.clientFilterSmart', { count: smartFilterCount }))
    }
    return t('careersHub.context.clientFiltersActive', { filters: parts.join(', ') })
  })()

  return (
    <div
      className={cn(
        'careers-hub-analysis-context',
        status === 'scanning' && 'is-scanning',
        status === 'done' && 'is-done',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="careers-hub-analysis-context-icon">
        {scanning ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="h-5 w-5" aria-hidden="true" />
        )}
      </div>
      <div className="careers-hub-analysis-context-copy">
        <div className="careers-hub-analysis-context-head">
          <p className="careers-hub-analysis-context-label">{t('careersHub.context.title')}</p>
          {status !== 'idle' ? (
            <span className="careers-hub-analysis-context-badge">
              {scanning ? t('careersHub.context.badgeScanning') : t('careersHub.context.badgeActive')}
            </span>
          ) : null}
        </div>
        <p className="careers-hub-analysis-context-detail">{detail}</p>
        {clientFilterSummary && meta && !scanning ? (
          <p className="careers-hub-analysis-context-refine">{clientFilterSummary}</p>
        ) : null}
      </div>
    </div>
  )
}
