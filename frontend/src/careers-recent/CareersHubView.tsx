import {
  Building2,
  ChevronDown,
  Loader2,
  MapPin,
  Search,
  TextSearch,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { PageLayout } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { jobsFetch } from '@/jobs/api'
import type {
  Company,
  CompanyScanWindow,
  JobOffer,
  RecentCareersOfferRow,
} from '@/jobs/types'
import type { LlmStats } from '@/jobs/types/llm'
import { billingApi, type BillingStatus } from '@/billing/api'
import { DuplicateApplicationModal } from '@/components/DuplicateApplicationModal'
import type { ApplicationTrackerMatch } from '@/applications/trackerMatch'
import { navigateToTracker } from '@/pipeline/pipelineBridge'
import { registerApplyTarget } from '@/apply/extensionBridge'
import { OfferApplyModal } from '@/jobs/components/OfferApplyModal'
import { CareersCompaniesPanel } from '@/companies/CareersCompaniesPanel'
import {
  careersOfferRowKey,
  careersOfferToJobOffer,
  dismissCareersOffer,
  trackCareersOffer,
} from '@/careers-recent/trackCareersOffer'
import { DiscoverOffersTable } from '@/discover/shared/DiscoverOffersTable'
import {
  applyCareersSmartFilters,
  type CareersSmartFilterId,
} from '@/careers-recent/careersSmartFilters'
import { CareersSmartFiltersBar } from '@/careers-recent/CareersSmartFiltersBar'
import { CareersAnalysisContextBar } from '@/careers-recent/CareersAnalysisContextBar'
import {
  executeUnifiedCareersScan,
  type UnifiedScanMeta,
  type ScanProgress,
} from '@/careers-recent/careersUnifiedScan'
import { enrichCareersOffersProfileFit } from '@/jobs/enrichOffersProfileFit'
import { countStrongMatches, sortByProfileFit } from '@/jobs/profileFit'
import { saveCareersScanSnapshot } from '@/careers-recent/careersScanAlerts'
import { saveTopMatchesFromCareers } from '@/discover/topMatchesCache'
import './recent-careers.css'
import './careers-hub.css'

function formatPostedAt(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CareersHubView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t, i18n } = useTranslation()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [llmStats, setLlmStats] = useState<LlmStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [watchlistOpen, setWatchlistOpen] = useState(true)
  const [panelStatus, setPanelStatus] = useState<string | null>(null)
  const [panelError, setPanelError] = useState<string | null>(null)

  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)
  const [rawOffers, setRawOffers] = useState<RecentCareersOfferRow[]>([])
  const [scanMeta, setScanMeta] = useState<UnifiedScanMeta | null>(null)

  const [keyword, setKeyword] = useState('')
  const [postedWithin, setPostedWithin] = useState<CompanyScanWindow>('24h')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [roleQuery, setRoleQuery] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [smartFilters, setSmartFilters] = useState<Set<CareersSmartFilterId>>(new Set())

  const [error, setError] = useState<string | null>(null)
  const [trackedByKey, setTrackedByKey] = useState<Record<string, number>>({})
  const [trackingKey, setTrackingKey] = useState<string | null>(null)
  const [duplicateMatch, setDuplicateMatch] = useState<ApplicationTrackerMatch | null>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [pendingOffer, setPendingOffer] = useState<RecentCareersOfferRow | null>(null)
  const [trackSaving, setTrackSaving] = useState(false)
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set())
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyModalCareersOffer, setApplyModalCareersOffer] = useState<RecentCareersOfferRow | null>(null)
  const [applyModalOffer, setApplyModalOffer] = useState<JobOffer | null>(null)
  const [applyModalLoading, setApplyModalLoading] = useState(false)

  const canUseLiveJobs = billing?.features.live_jobs === true
  const locale = i18n.language.startsWith('it') ? 'it-IT' : 'en-US'

  const loadCompanies = useCallback(async () => {
    if (!canUseLiveJobs) {
      setCompanies([])
      return
    }
    try {
      setCompanies(await jobsFetch<Company[]>('/api/jobs/companies?include_inactive=true'))
    } catch {
      setCompanies([])
    }
  }, [canUseLiveJobs])

  useEffect(() => {
    billingApi.status().then(setBilling).catch(() => setBilling(null))
  }, [])

  useEffect(() => {
    if (!canUseLiveJobs) return
    jobsFetch<LlmStats>('/api/jobs/llm/stats').then(setLlmStats).catch(() => setLlmStats(null))
    void loadCompanies()
  }, [canUseLiveJobs, loadCompanies])

  const scannableCompanies = useMemo(
    () => companies.filter((c) => c.id != null && c.active).sort((a, b) => a.name.localeCompare(b.name, locale)),
    [companies, locale],
  )

  const pickerCompanies = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return scannableCompanies
    return scannableCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(q)
        || c.slug.toLowerCase().includes(q)
        || c.ats.toLowerCase().includes(q),
    )
  }, [scannableCompanies, pickerQuery])

  const priorityCompanyIds = useMemo(
    () => new Set(companies.filter((c) => c.priority && c.active && c.id != null).map((c) => c.id!)),
    [companies],
  )

  const filteredOffers = useMemo(
    () =>
      applyCareersSmartFilters(
        rawOffers,
        smartFilters,
        roleQuery,
        locationQuery,
        { trackedByKey, priorityCompanyIds, dismissedKeys },
      ),
    [rawOffers, smartFilters, roleQuery, locationQuery, trackedByKey, priorityCompanyIds, dismissedKeys],
  )

  const strongMatchCount = useMemo(() => countStrongMatches(rawOffers), [rawOffers])

  const scopeLabel =
    selectedIds.size > 0 && selectedIds.size < scannableCompanies.length
      ? t('careersHub.filters.scopeSelected', { count: selectedIds.size })
      : t('careersHub.filters.scopeAll')

  const runScan = async () => {
    if (keyword.trim().length === 1) {
      setError(t('careersRecent.errors.keywordTooShort'))
      return
    }
    setScanning(true)
    setScanProgress(null)
    setError(null)
    try {
      const result = await executeUnifiedCareersScan({
        keyword,
        postedWithin,
        selectedCompanyIds: selectedIds,
        scannableCompanies,
        onProgress: setScanProgress,
      })
      const enriched = sortByProfileFit(await enrichCareersOffersProfileFit(result.offers))
      setRawOffers(enriched)
      setScanMeta({ ...result.meta, offerCount: enriched.length })
      saveTopMatchesFromCareers(enriched)
      saveCareersScanSnapshot(enriched)
      await loadCompanies()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('careersRecent.errors.scanFailed'))
    } finally {
      setScanning(false)
      setScanProgress(null)
    }
  }

  const handleOffersScanned = useCallback(async (offers: RecentCareersOfferRow[]) => {
    const enriched = sortByProfileFit(await enrichCareersOffersProfileFit(offers))
    setRawOffers(enriched)
    setScanMeta({
      keyword: '',
      postedWithin,
      scope: 'selected',
      selectedCount: 1,
      companiesScanned: 1,
      companiesFailed: 0,
      offerCount: enriched.length,
      strategy: 'selected-scan',
    })
    saveTopMatchesFromCareers(enriched)
    saveCareersScanSnapshot(enriched)
  }, [postedWithin])

  const markTracked = (offer: RecentCareersOfferRow, applicationId: number) => {
    setTrackedByKey((prev) => ({ ...prev, [careersOfferRowKey(offer)]: applicationId }))
  }

  const handleMarkApplied = async (offer: RecentCareersOfferRow, allowDuplicate = false) => {
    const key = careersOfferRowKey(offer)
    setTrackingKey(key)
    setError(null)
    try {
      const res = await trackCareersOffer(offer, { allowDuplicate })
      markTracked(offer, res.application_id)
      if (res.already_applied && res.tracker_match && !allowDuplicate) {
        setPendingOffer(offer)
        setDuplicateMatch(res.tracker_match)
        setDuplicateOpen(true)
        return
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('careersRecent.errors.trackFailed'))
    } finally {
      setTrackingKey(null)
    }
  }

  const handleCreateDuplicate = async () => {
    if (!pendingOffer) return
    setTrackSaving(true)
    try {
      const res = await trackCareersOffer(pendingOffer, { allowDuplicate: true })
      markTracked(pendingOffer, res.application_id)
      setDuplicateOpen(false)
      setDuplicateMatch(null)
      setPendingOffer(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('careersRecent.errors.trackFailed'))
    } finally {
      setTrackSaving(false)
    }
  }

  const closeApplyModal = useCallback(() => {
    setApplyModalOpen(false)
    setApplyModalCareersOffer(null)
    setApplyModalOffer(null)
  }, [])

  const handleOpenApply = useCallback((offer: RecentCareersOfferRow) => {
    const applyUrl = (offer.apply_url || '').trim()
    if (!applyUrl) return
    window.open(applyUrl, '_blank')
    registerApplyTarget(applyUrl, `${offer.company_name} · ${offer.role}`)
    setApplyModalCareersOffer(offer)
    setApplyModalOffer(careersOfferToJobOffer(offer))
    setApplyModalOpen(true)
  }, [])

  const handleApplyModalMarkApplied = useCallback(async () => {
    if (!applyModalCareersOffer) return
    setApplyModalLoading(true)
    try {
      await handleMarkApplied(applyModalCareersOffer)
      closeApplyModal()
    } finally {
      setApplyModalLoading(false)
    }
  }, [applyModalCareersOffer, closeApplyModal])

  const handleApplyModalDismiss = useCallback(async () => {
    if (!applyModalCareersOffer) return
    setApplyModalLoading(true)
    setError(null)
    try {
      await dismissCareersOffer(applyModalCareersOffer)
      setDismissedKeys((prev) => new Set(prev).add(careersOfferRowKey(applyModalCareersOffer)))
      closeApplyModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('jobs.errors.dismissFailed'))
    } finally {
      setApplyModalLoading(false)
    }
  }, [applyModalCareersOffer, closeApplyModal, t])

  const handleApplyModalReopen = useCallback(() => {
    if (!applyModalCareersOffer) return
    const applyUrl = (applyModalCareersOffer.apply_url || '').trim()
    if (!applyUrl) return
    window.open(applyUrl, '_blank')
    registerApplyTarget(applyUrl, `${applyModalCareersOffer.company_name} · ${applyModalCareersOffer.role}`)
  }, [applyModalCareersOffer])

  const clearLocalFilters = () => {
    setRoleQuery('')
    setLocationQuery('')
    setSmartFilters(new Set())
  }

  const tableProps = {
    locale: i18n.language,
    trackedByKey,
    trackingKey,
    onMarkApplied: (offer: RecentCareersOfferRow) => void handleMarkApplied(offer),
    onOpenApply: handleOpenApply,
    formatPostedAt,
  }

  if (!canUseLiveJobs) {
    const gate = <p className="text-sm text-muted-foreground">{t('careersRecent.jobsRequired')}</p>
    if (embedded) return gate
    return (
      <PageLayout title={t('careersHub.title')} description={t('careersHub.description')}>
        {gate}
      </PageLayout>
    )
  }

  const body = (
    <div className="careers-hub">
      <section className="recent-careers-panel careers-hub-search-panel">
        <div className="careers-hub-search-grid">
          <div className="careers-hub-field careers-hub-field-keyword">
            <label htmlFor="careers-keyword">{t('careersHub.filters.keyword')}</label>
            <div className="recent-careers-search">
              <TextSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="careers-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t('careersRecent.keywordPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !scanning) void runScan()
                }}
              />
            </div>
          </div>
          <div className="careers-hub-field">
            <label htmlFor="careers-period">{t('careersHub.filters.period')}</label>
            <Select
              value={postedWithin}
              onValueChange={(v) => setPostedWithin(v as CompanyScanWindow)}
              disabled={scanning}
            >
              <SelectTrigger id="careers-period" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t('careersHub.filters.anyPeriod')}</SelectItem>
                <SelectItem value="24h">{t('companies.careers.scanWindow24h')}</SelectItem>
                <SelectItem value="7d">{t('companies.careers.scanWindow7d')}</SelectItem>
                <SelectItem value="30d">{t('companies.careers.scanWindow30d')}</SelectItem>
                <SelectItem value="90d">{t('companies.careers.scanWindow90d')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="careers-hub-field">
            <span className="careers-hub-field-label">{t('careersHub.filters.scope')}</span>
            <Button
              type="button"
              variant="outline"
              className="careers-hub-scope-btn"
              onClick={() => setPickerOpen(true)}
              disabled={scanning}
            >
              {scopeLabel}
              {selectedIds.size > 0 && selectedIds.size < scannableCompanies.length ? (
                <Badge variant="secondary" className="ml-2">{selectedIds.size}</Badge>
              ) : null}
            </Button>
          </div>
          <div className="careers-hub-field careers-hub-field-action">
            <span className="careers-hub-field-label" aria-hidden="true">&nbsp;</span>
            <Button
              type="button"
              className="careers-hub-scan-btn"
              onClick={() => void runScan()}
              disabled={scanning}
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('careersRecent.scanning')}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t('careersHub.filters.runScan')}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="careers-hub-refine-row">
          <div className="recent-careers-search">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={roleQuery}
              onChange={(e) => setRoleQuery(e.target.value)}
              placeholder={t('careersRecent.searchPlaceholder')}
              disabled={!rawOffers.length}
            />
          </div>
          <div className="recent-careers-search">
            <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder={t('careersRecent.locationPlaceholder')}
              disabled={!rawOffers.length}
            />
          </div>
        </div>

        {scanning && (
          <p className="recent-careers-scanning-hint">{t('careersRecent.scanningHint')}</p>
        )}
      </section>

      <CareersAnalysisContextBar
        scanning={scanning}
        scanProgress={scanProgress}
        meta={scanMeta}
        filteredCount={filteredOffers.length}
        strongMatchCount={strongMatchCount}
        roleQuery={roleQuery}
        locationQuery={locationQuery}
        smartFilterCount={smartFilters.size}
      />

      {error ? <p className="recent-careers-error">{error}</p> : null}

      {!scanMeta && !scanning && !error && (
        <PlatformEmptyState
          icon={<Search className="h-7 w-7" />}
          title={t('careersHub.emptyTitle')}
          description={t('careersHub.emptyDescription')}
        />
      )}

      {scanMeta && (
        <>
          {rawOffers.length > 0 && (
            <CareersSmartFiltersBar active={smartFilters} onChange={setSmartFilters} />
          )}
          {filteredOffers.length > 0 ? (
            <DiscoverOffersTable offers={filteredOffers} {...tableProps} />
          ) : rawOffers.length > 0 ? (
            <PlatformEmptyState
              icon={<Search className="h-7 w-7" />}
              title={t('careersRecent.noFilterMatchTitleWithCount', { count: rawOffers.length })}
              description={t('careersRecent.noFilterMatchDescriptionWithCount', { count: rawOffers.length })}
              actionLabel={t('careersRecent.clearLocalFilters')}
              onAction={clearLocalFilters}
            />
          ) : (
            <PlatformEmptyState
              icon={<Search className="h-7 w-7" />}
              title={t('careersRecent.noOffersTitle')}
              description={t('careersRecent.noOffersDescription')}
            />
          )}
        </>
      )}

      <section className="careers-hub-watchlist">
        <button
          type="button"
          className="careers-hub-watchlist-toggle"
          onClick={() => setWatchlistOpen((open) => !open)}
          aria-expanded={watchlistOpen}
        >
          <span className="careers-hub-watchlist-toggle-label">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            {t('careersHub.watchlistTitle', { count: scannableCompanies.length })}
          </span>
          <ChevronDown className={cn('careers-hub-watchlist-chevron', watchlistOpen && 'open')} aria-hidden="true" />
        </button>
        {watchlistOpen && (
          <div className="careers-hub-watchlist-body">
            {(panelStatus || panelError) && (
              <p className={cn('text-sm mb-3', panelError ? 'text-destructive' : 'text-muted-foreground')}>
                {panelError || panelStatus}
              </p>
            )}
            <CareersCompaniesPanel
              layout="watchlist"
              companies={companies}
              onRefresh={loadCompanies}
              discovering={discovering}
              onDiscoveringChange={setDiscovering}
              onError={setPanelError}
              onSuccess={setPanelStatus}
              onLlmRefresh={() => {
                jobsFetch<LlmStats>('/api/jobs/llm/stats').then(setLlmStats).catch(() => setLlmStats(null))
              }}
              discoverCompanyEnabled={llmStats?.discover_company_enabled ?? false}
              autoDiscoverEnabled={llmStats?.auto_discover_enabled ?? false}
              onOffersScanned={handleOffersScanned}
            />
          </div>
        )}
      </section>

      <Dialog open={pickerOpen} onOpenChange={(open) => { setPickerOpen(open); if (!open) setPickerQuery('') }}>
        <DialogContent className="max-w-md platform-portal">
          <DialogHeader>
            <DialogTitle>{t('companies.careers.selectCareersTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder={t('companies.careers.selectCareersSearch')}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set(pickerCompanies.map((c) => c.id!)))}
                disabled={pickerCompanies.length === 0}
              >
                {t('companies.careers.selectAllVisible')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                {t('companies.careers.clearSelection')}
              </Button>
            </div>
            <div className="careers-picker-list">
              {pickerCompanies.map((company) => (
                <label key={company.id} className="careers-picker-item">
                  <Checkbox
                    checked={selectedIds.has(company.id!)}
                    onCheckedChange={(v) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (v === true) next.add(company.id!)
                        else next.delete(company.id!)
                        return next
                      })
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{company.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {company.ats} · {company.slug}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPickerOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateApplicationModal
        open={duplicateOpen}
        match={duplicateMatch}
        mode="live"
        saving={trackSaving}
        onClose={() => {
          setDuplicateOpen(false)
          setDuplicateMatch(null)
          setPendingOffer(null)
        }}
        onOpenTracker={(applicationId) => {
          setDuplicateOpen(false)
          navigateToTracker({ applicationId })
        }}
        onCreateDuplicate={() => void handleCreateDuplicate()}
      />

      <OfferApplyModal
        open={applyModalOpen}
        offer={applyModalOffer}
        applyUrl={applyModalCareersOffer?.apply_url ?? ''}
        loading={applyModalLoading}
        onClose={closeApplyModal}
        onMarkApplied={() => void handleApplyModalMarkApplied()}
        onDismiss={() => void handleApplyModalDismiss()}
        onReopenApply={handleApplyModalReopen}
      />
    </div>
  )

  if (embedded) return body

  return (
    <PageLayout title={t('careersHub.title')} description={t('careersHub.description')}>
      {body}
    </PageLayout>
  )
}

export { CareersHubView as RecentCareersView }
