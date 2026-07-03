import { Clock, Loader2, MapPin, Search, TextSearch } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { offerteFetch } from '@/offerte/api'
import type { JobOffer, RecentCareersOfferRow, ScanAllRecentResult } from '@/offerte/types'
import { billingApi, type BillingStatus } from '@/billing/api'
import { DuplicateApplicationModal } from '@/components/DuplicateApplicationModal'
import type { ApplicationTrackerMatch } from '@/applications/trackerMatch'
import { navigateToTracker } from '@/pipeline/pipelineBridge'
import { registerApplyTarget } from '@/apply/extensionBridge'
import { OfferApplyModal } from '@/offerte/components/OfferApplyModal'
import {
  careersOfferRowKey,
  careersOfferToJobOffer,
  dismissCareersOffer,
  trackCareersOffer,
} from '@/careers-recent/trackCareersOffer'
import { DiscoverOffersTable } from '@/discover/shared/DiscoverOffersTable'
import {
  filterCareersOffers,
  filterCareersOffersByLocation,
} from '@/careers-recent/filterCareersOffers'
import './recent-careers.css'

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

function filterDismissed(
  offers: RecentCareersOfferRow[],
  dismissedKeys: Set<string>,
): RecentCareersOfferRow[] {
  if (!dismissedKeys.size) return offers
  return offers.filter((offer) => !dismissedKeys.has(careersOfferRowKey(offer)))
}

export function RecentCareersView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<'recent' | 'search'>('recent')
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  const [recentScanning, setRecentScanning] = useState(false)
  const [recentResult, setRecentResult] = useState<ScanAllRecentResult | null>(null)
  const [recentTitleQuery, setRecentTitleQuery] = useState('')
  const [recentLocationQuery, setRecentLocationQuery] = useState('')

  const [searchScanning, setSearchScanning] = useState(false)
  const [searchResult, setSearchResult] = useState<ScanAllRecentResult | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchLocationQuery, setSearchLocationQuery] = useState('')

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

  const canUseOfferte = billing?.features.offerte_live === true

  useEffect(() => {
    billingApi.status().then(setBilling).catch(() => setBilling(null))
  }, [])

  const recentFilteredOffers = useMemo(() => {
    if (!recentResult?.offers.length) return []
    return filterCareersOffers(
      filterDismissed(recentResult.offers, dismissedKeys),
      recentTitleQuery,
      recentLocationQuery,
    )
  }, [recentResult, recentTitleQuery, recentLocationQuery, dismissedKeys])

  const searchFilteredOffers = useMemo(
    () =>
      filterCareersOffersByLocation(
        filterDismissed(searchResult?.offers ?? [], dismissedKeys),
        searchLocationQuery,
      ),
    [searchResult, searchLocationQuery, dismissedKeys],
  )

  const runRecentScan = async () => {
    setRecentScanning(true)
    setError(null)
    try {
      const data = await offerteFetch<ScanAllRecentResult>('/api/offerte/companies/scan-all-recent', {
        method: 'POST',
        body: JSON.stringify({ posted_within: '24h' }),
      })
      setRecentResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('careersRecent.errors.scanFailed'))
      setRecentResult(null)
    } finally {
      setRecentScanning(false)
    }
  }

  const runTitleSearch = async () => {
    const keyword = searchKeyword.trim()
    if (keyword.length < 2) {
      setError(t('careersRecent.errors.keywordTooShort'))
      return
    }
    setSearchScanning(true)
    setError(null)
    try {
      const data = await offerteFetch<ScanAllRecentResult>('/api/offerte/companies/scan-all-search', {
        method: 'POST',
        body: JSON.stringify({ title_query: keyword }),
      })
      setSearchResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('careersRecent.errors.scanFailed'))
      setSearchResult(null)
    } finally {
      setSearchScanning(false)
    }
  }

  const markTracked = (offer: RecentCareersOfferRow, applicationId: number) => {
    const key = `${offer.company_id ?? 0}:${offer.apply_url}:${offer.role}`
    setTrackedByKey((prev) => ({ ...prev, [key]: applicationId }))
  }

  const handleMarkApplied = async (offer: RecentCareersOfferRow, allowDuplicate = false) => {
    const key = `${offer.company_id ?? 0}:${offer.apply_url}:${offer.role}`
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
      const key = careersOfferRowKey(applyModalCareersOffer)
      setDismissedKeys((prev) => new Set(prev).add(key))
      closeApplyModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('offerte.errors.dismissFailed'))
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

  const tableProps = {
    locale: i18n.language,
    trackedByKey,
    trackingKey,
    onMarkApplied: (offer: RecentCareersOfferRow) => void handleMarkApplied(offer),
    onOpenApply: handleOpenApply,
    formatPostedAt,
  }

  if (!canUseOfferte) {
    const gate = <p className="text-sm text-muted-foreground">{t('careersRecent.offerteRequired')}</p>
    if (embedded) return gate
    return (
      <PageLayout title={t('careersRecent.title')} description={t('careersRecent.description')}>
        {gate}
      </PageLayout>
    )
  }

  const body = (
    <>
      <Tabs value={tab} onValueChange={(value) => setTab(value as 'recent' | 'search')}>
        <TabsList>
          <TabsTrigger value="recent" className="gap-1.5">
            <Clock className="h-4 w-4" />
            {t('careersRecent.tabRecent')}
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-1.5">
            <TextSearch className="h-4 w-4" />
            {t('careersRecent.tabSearch')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="mt-4">
          <section className="recent-careers-panel">
            <div className="recent-careers-toolbar">
              <Button type="button" onClick={runRecentScan} disabled={recentScanning} className="recent-careers-scan-btn">
                {recentScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('careersRecent.scanning')}
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    {t('careersRecent.scanButton')}
                  </>
                )}
              </Button>
              {recentScanning && (
                <p className="recent-careers-scanning-hint">{t('careersRecent.scanningHint')}</p>
              )}
              <div className="recent-careers-filters">
                <div className="recent-careers-search">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={recentTitleQuery}
                    onChange={(e) => setRecentTitleQuery(e.target.value)}
                    placeholder={t('careersRecent.searchPlaceholder')}
                    disabled={!recentResult?.offers.length}
                  />
                </div>
                <div className="recent-careers-search">
                  <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={recentLocationQuery}
                    onChange={(e) => setRecentLocationQuery(e.target.value)}
                    placeholder={t('careersRecent.locationPlaceholder')}
                    disabled={!recentResult?.offers.length}
                  />
                </div>
              </div>
            </div>

            {error && tab === 'recent' && <p className="recent-careers-error">{error}</p>}

            {recentResult && !recentScanning && (
              <p className="recent-careers-summary">
                {t('careersRecent.summary', {
                  companies: recentResult.companies_scanned,
                  offers: recentResult.offer_count,
                  filtered: recentFilteredOffers.length,
                })}
                {recentResult.companies_failed > 0
                  ? ` · ${t('careersRecent.summaryFailed', { failed: recentResult.companies_failed })}`
                  : ''}
              </p>
            )}

            {!recentResult && !recentScanning && !error && (
              <PlatformEmptyState
                icon={<Clock className="h-7 w-7" />}
                title={t('careersRecent.emptyTitle')}
                description={t('careersRecent.emptyDescription')}
              />
            )}

            {recentResult && recentFilteredOffers.length > 0 && (
              <DiscoverOffersTable offers={recentFilteredOffers} {...tableProps} />
            )}

            {recentResult && recentResult.offers.length > 0 && recentFilteredOffers.length === 0 && (
              <PlatformEmptyState
                icon={<Search className="h-7 w-7" />}
                title={t('careersRecent.noFilterMatchTitle')}
                description={t('careersRecent.noFilterMatchDescription')}
              />
            )}

            {recentResult && recentResult.offers.length === 0 && !recentScanning && (
              <PlatformEmptyState
                icon={<Clock className="h-7 w-7" />}
                title={t('careersRecent.noOffersTitle')}
                description={t('careersRecent.noOffersDescription')}
              />
            )}
          </section>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <section className="recent-careers-panel">
            <div className="recent-careers-toolbar">
              <div className="recent-careers-search recent-careers-search-primary">
                <TextSearch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder={t('careersRecent.keywordPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !searchScanning) void runTitleSearch()
                  }}
                />
              </div>
              <Button
                type="button"
                onClick={() => void runTitleSearch()}
                disabled={searchScanning || searchKeyword.trim().length < 2}
                className="recent-careers-scan-btn"
              >
                {searchScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('careersRecent.searchScanning')}
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    {t('careersRecent.searchButton')}
                  </>
                )}
              </Button>
              {searchScanning && (
                <p className="recent-careers-scanning-hint">{t('careersRecent.searchScanningHint')}</p>
              )}
              <div className="recent-careers-search">
                <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={searchLocationQuery}
                  onChange={(e) => setSearchLocationQuery(e.target.value)}
                  placeholder={t('careersRecent.locationPlaceholder')}
                  disabled={!searchResult?.offers.length}
                />
              </div>
            </div>

            {error && tab === 'search' && <p className="recent-careers-error">{error}</p>}

            {searchResult && !searchScanning && (
              <p className="recent-careers-summary">
                {t('careersRecent.searchSummary', {
                  keyword: searchResult.title_query ?? searchKeyword.trim(),
                  companies: searchResult.companies_scanned,
                  offers: searchResult.offer_count,
                  filtered: searchFilteredOffers.length,
                })}
                {searchResult.companies_failed > 0
                  ? ` · ${t('careersRecent.summaryFailed', { failed: searchResult.companies_failed })}`
                  : ''}
              </p>
            )}

            {!searchResult && !searchScanning && !error && (
              <PlatformEmptyState
                icon={<TextSearch className="h-7 w-7" />}
                title={t('careersRecent.searchEmptyTitle')}
                description={t('careersRecent.searchEmptyDescription')}
              />
            )}

            {searchResult && searchFilteredOffers.length > 0 && (
              <DiscoverOffersTable offers={searchFilteredOffers} {...tableProps} />
            )}

            {searchResult && searchResult.offers.length > 0 && searchFilteredOffers.length === 0 && (
              <PlatformEmptyState
                icon={<MapPin className="h-7 w-7" />}
                title={t('careersRecent.noFilterMatchTitle')}
                description={t('careersRecent.noFilterMatchDescription')}
              />
            )}

            {searchResult && searchResult.offers.length === 0 && !searchScanning && (
              <PlatformEmptyState
                icon={<TextSearch className="h-7 w-7" />}
                title={t('careersRecent.searchNoOffersTitle')}
                description={t('careersRecent.searchNoOffersDescription', {
                  keyword: searchResult.title_query ?? searchKeyword.trim(),
                })}
              />
            )}
          </section>
        </TabsContent>
      </Tabs>

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
    </>
  )

  if (embedded) return body

  return (
    <PageLayout title={t('careersRecent.title')} description={t('careersRecent.description')}>
      {body}
    </PageLayout>
  )
}
