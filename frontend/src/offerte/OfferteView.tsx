import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { isCompletedApplication } from './offerApplicationStatus'
import type { SearchResult, SearchSummary, SearchCommand, JobOffer, SearchPreferences, SearchRequest } from './types'
import { EMPTY_COMMAND, DEFAULT_SEARCH_PREFERENCES } from './types'
import { SearchPanel } from './components/SearchPanel'
import type { OfferStatusFilter } from './components/StatsBar'
import { OffersListToolbar } from './components/OffersListToolbar'
import { OffersTable } from './components/OffersTable'
import { OfferteSettingsSheet } from './components/OfferteSettingsSheet'
import { OfferteHistorySheet } from './components/OfferteHistorySheet'
import { UpgradeGate } from './components/UpgradeGate'
import type { LlmControlsUpdate, LlmStats } from './types/llm'
import { offerteFetch } from './api'
import { setOfferteSearchPhase } from './offerteSearchProgress'
import { billingApi, type BillingStatus } from '../billing/api'
import { prepareApplyCompanionContext, registerApplyTarget } from '../apply/extensionBridge'
import { resolveApplyUrl } from '../apply/resolveApplyUrl'
import { formatUsd, formatUsdSpend } from './formatUsd'
import { applySessionFiltersSplit, countOffersByStatus } from './applySessionFilters'
import { promptInterpretationItems } from './offerPromptRelevance'
import { matchesOfferListSearch } from './offerListSearch'
import { PlatformPageHeader } from '../layout/PlatformPageHeader'
import { navigateToTracker, openAnnuncioAnalyzeInNewTab } from '../pipeline/pipelineBridge'
import type { Application } from '../types'
import { getApplication, getApplications } from '@/lib/applications-apollo'
import { subscribeOfferDismissed, subscribeOfferApplied, offerMatchesDismissSync, offerMatchesAppliedSync, publishOfferApplied, publishOfferDismissed, type OfferDismissSyncPayload, type OfferAppliedSyncPayload } from './offerteSyncChannel'
import { DuplicateApplicationModal } from '../components/DuplicateApplicationModal'
import type { ApplicationTrackerMatch } from '../applications/trackerMatch'
import '../components/DuplicateApplicationModal.css'
import { navigate, parseRoute, isDiscoverSearchRoute } from '../router'
import {
  saveOfferteListSnapshot,
  consumeOfferteListRestore,
  consumeHighlightOfferId,
  consumeDismissOfferId,
  hasPendingOfferteListRestore,
} from './offerteListSession'
import {
  saveApplyModalOffer,
  readApplyModalOffer,
  clearApplyModalOffer,
} from './offerApplyModalSession'
import { OfferApplyModal } from './components/OfferApplyModal'
import { ArchivedLiveOfferDialog } from './components/ArchivedLiveOfferDialog'
import './offerte-theme.css'
import './offerte-layout.css'

type StatusFilter = OfferStatusFilter
type PipelineView = 'valid' | 'dismissed'

function normalizeStatusFilter(value: string): StatusFilter {
  if (value === 'rejected') return 'dismissed'
  if (value === 'all' || value === 'verified' || value === 'maybe' || value === 'dismissed' || value === 'applied') return value
  return 'all'
}

function poolFromResult(data: SearchResult): JobOffer[] {
  return data.offer_pool?.length ? data.offer_pool : data.offers
}

function patchOfferForRouteHighlight(
  offer: JobOffer,
  offerId: string,
  applicationId?: number,
): JobOffer {
  if (offer.id !== offerId) return offer
  return {
    ...offer,
    applied: true,
    tracker_status: 'applied',
    application_id: applicationId ?? offer.application_id,
  }
}

function normalizePreferences(prefs: Partial<SearchPreferences>): SearchPreferences {
  return {
    ...DEFAULT_SEARCH_PREFERENCES,
    ...prefs,
    default_locations: [...(prefs.default_locations ?? DEFAULT_SEARCH_PREFERENCES.default_locations)],
    origins: [...(prefs.origins ?? DEFAULT_SEARCH_PREFERENCES.origins)],
  }
}

function clonePreferences(prefs: SearchPreferences): SearchPreferences {
  return { ...prefs, default_locations: [...prefs.default_locations], origins: [...(prefs.origins || [])] }
}

function resultWithPreferences(data: SearchResult, prefs: SearchPreferences): SearchResult {
  return { ...data, preferences: clonePreferences(prefs) }
}

function applyPrefsToResult(data: SearchResult, prefs: SearchPreferences): {
  result: SearchResult
  pool: JobOffer[]
} {
  const pool = poolFromResult(data)
  if (pool.length === 0) {
    return { result: resultWithPreferences(data, prefs), pool }
  }
  const { combined } = applySessionFiltersSplit(pool, prefs, {
    command: data.command,
  })
  return {
    pool,
    result: {
      ...data,
      offers: combined,
      preferences: clonePreferences(prefs),
      ...countOffersByStatus(combined),
    },
  }
}

export default function OfferteView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const [result, setResult] = useState<SearchResult | null>(null)
  const [command, setCommand] = useState<SearchCommand>(EMPTY_COMMAND)
  const [history, setHistory] = useState<SearchSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [llmStats, setLlmStats] = useState<LlmStats | null>(null)
  const [llmStatsError, setLlmStatsError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [searchPreferences, setSearchPreferences] = useState<SearchPreferences>(DEFAULT_SEARCH_PREFERENCES)
  const [sessionFilters, setSessionFilters] = useState<SearchPreferences>(DEFAULT_SEARCH_PREFERENCES)
  const [offerPool, setOfferPool] = useState<JobOffer[]>([])
  const [highlightOfferId, setHighlightOfferId] = useState<string | null>(null)
  const [listSearchQuery, setListSearchQuery] = useState('')
  const [pipelineView, setPipelineView] = useState<PipelineView>('valid')
  const [trackerLinkApplicationId, setTrackerLinkApplicationId] = useState<number | null>(null)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicateMatch, setDuplicateMatch] = useState<ApplicationTrackerMatch | null>(null)
  const [applyModalOffer, setApplyModalOffer] = useState<JobOffer | null>(() => readApplyModalOffer())
  const [applyModalOpen, setApplyModalOpen] = useState(() => readApplyModalOffer() != null)
  const [applyModalLoading, setApplyModalLoading] = useState(false)
  const [archivedLiveOffer, setArchivedLiveOffer] = useState<JobOffer | null>(null)
  const [missingLiveOfferId, setMissingLiveOfferId] = useState<string | null>(null)
  const [archivedResolveDone, setArchivedResolveDone] = useState(false)
  const [archivedModalOpen, setArchivedModalOpen] = useState(false)
  const dismissedArchivedModalRef = useRef<string | null>(null)
  const bootstrapDoneRef = useRef(false)
  const routeHighlightAppliedRef = useRef<string | null>(null)

  const canUseOfferte = billing?.features.offerte_live === true

  const sessionFilterOptions = { command }

  const applyOfferHighlightFromRoute = useCallback((
    poolOverride?: JobOffer[],
    prefsOverride?: SearchPreferences,
    commandOverride?: SearchCommand,
  ) => {
    const route = parseRoute()
    if (!isDiscoverSearchRoute(route)) return false
    if (route.statusFilter === 'applied') {
      setPipelineView('valid')
      setStatusFilter('applied')
    }
    if (!route.highlightOfferId) return false

    const offerId = route.highlightOfferId
    const applicationId = route.trackerApplicationId
    setHighlightOfferId(offerId)
    setPipelineView('valid')
    setStatusFilter('applied')
    if (applicationId) setTrackerLinkApplicationId(applicationId)

    const patchPool = (pool: JobOffer[]) =>
      pool.length ? pool.map((o) => patchOfferForRouteHighlight(o, offerId, applicationId)) : pool

    if (poolOverride) {
      const nextPool = patchPool(poolOverride)
      const prefs = prefsOverride ?? sessionFilters
      const filterCommand = commandOverride ?? command
      const { combined } = applySessionFiltersSplit(nextPool, prefs, { command: filterCommand })
      setOfferPool(nextPool)
      setResult((prev) =>
        prev
          ? {
              ...prev,
              offers: combined,
              preferences: prefs,
              ...countOffersByStatus(combined),
            }
          : prev,
      )
    } else {
      setOfferPool((pool) => patchPool(pool))
      setResult((prev) => {
        if (!prev) return prev
        const nextOffers = prev.offers.map((o) => patchOfferForRouteHighlight(o, offerId, applicationId))
        return {
          ...prev,
          offers: nextOffers,
          ...countOffersByStatus(nextOffers),
        }
      })
    }

    requestAnimationFrame(() => {
      document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return true
  }, [sessionFilters, command])

  const saveListSnapshot = useCallback(() => {
    if (!result) return
    saveOfferteListSnapshot({
      result,
      command,
      offerPool,
      sessionFilters,
      statusFilter,
    })
  }, [result, command, offerPool, sessionFilters, statusFilter])

  const closeApplyModal = useCallback(() => {
    setApplyModalOpen(false)
    setApplyModalOffer(null)
    clearApplyModalOffer()
  }, [])

  const openApplyModal = useCallback((offer: JobOffer) => {
    const applyUrl = resolveApplyUrl(offer) || offer.apply_url
    setApplyModalOffer(offer)
    setApplyModalOpen(true)
    saveApplyModalOffer(offer)
    prepareApplyCompanionContext({
      offerId: offer.id,
      company: offer.company,
      role: offer.role,
      applyUrl,
      location: offer.location,
      source: offer.source,
      label: `${offer.company} · ${offer.role}`,
    })
    saveListSnapshot()
  }, [saveListSnapshot])

  const applyPendingListRestore = useCallback(() => {
    if (!hasPendingOfferteListRestore()) return false
    const restored = consumeOfferteListRestore()
    if (!restored) return false
    const highlightId = consumeHighlightOfferId()
    const dismissId = consumeDismissOfferId()
    let nextResult = restored.result
    if (highlightId) {
      nextResult = {
        ...nextResult,
        offers: nextResult.offers.map((o) =>
          o.id === highlightId ? { ...o, applied: true, tracker_status: 'applied' } : o,
        ),
      }
      setHighlightOfferId(highlightId)
      setSuccess(t('offerte.success.appliedHighlighted'))
    }
    if (dismissId) {
      nextResult = {
        ...nextResult,
        offers: nextResult.offers.map((o) =>
          o.id === dismissId ? { ...o, user_dismissed: true } : o,
        ),
      }
      setStatusFilter('all')
      setSuccess(t('offerte.success.dismissed'))
    }
    setOfferPool(restored.offerPool.map((o) => {
      if (highlightId && o.id === highlightId) {
        return { ...o, applied: true, tracker_status: 'applied' }
      }
      if (dismissId && o.id === dismissId) {
        return { ...o, user_dismissed: true }
      }
      return o
    }))
    setResult(nextResult)
    setCommand(restored.command)
    setSessionFilters(restored.sessionFilters)
    setStatusFilter(normalizeStatusFilter(restored.statusFilter))
    requestAnimationFrame(() => {
      document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return true
  }, [])

  const loadSearchPreferences = useCallback(async (): Promise<SearchPreferences> => {
    try {
      const data = await offerteFetch<SearchPreferences>('/api/offerte/preferences')
      const normalized = normalizePreferences(data)
      setSearchPreferences(normalized)
      setSessionFilters(clonePreferences(normalized))
      return normalized
    } catch {
      return DEFAULT_SEARCH_PREFERENCES
    }
  }, [])

  const persistSearchPreferences = useCallback(async (prefs: SearchPreferences) => {
    const cloned = clonePreferences(prefs)
    const saved = await offerteFetch<SearchPreferences>('/api/offerte/preferences', {
      method: 'PUT',
      body: JSON.stringify(cloned),
    })
    const normalized = normalizePreferences(saved)
    setSearchPreferences(normalized)
    return normalized
  }, [])

  const loadLlmStats = useCallback(async () => {
    setLlmStatsError(null)
    try {
      const data = await offerteFetch<LlmStats>('/api/offerte/llm/stats')
      setLlmStats(data)
    } catch (e) {
      setLlmStatsError(e instanceof Error ? e.message : t('offerte.setup.backendUnreachable'))
    }
  }, [])

  const updateLlmBudget = useCallback(async (budget: number) => {
    const data = await offerteFetch<LlmStats>('/api/offerte/llm/budget', {
      method: 'PUT',
      body: JSON.stringify({ monthly_budget_usd: budget }),
    })
    setLlmStats(data)
  }, [])

  const updateLlmControls = useCallback(async (controls: LlmControlsUpdate) => {
    const data = await offerteFetch<LlmStats>('/api/offerte/llm/controls', {
      method: 'PUT',
      body: JSON.stringify(controls),
    })
    setLlmStats(data)
  }, [])

  const loadHistory = useCallback(async () => {
    const data = await offerteFetch<SearchSummary[]>('/api/offerte/searches')
    setHistory(data)
  }, [])

  const loadSearch = useCallback(async (id: number) => {
    setHistoryLoading(true)
    setError(null)
    try {
      const data = await offerteFetch<SearchResult>(`/api/offerte/searches/${id}`)
      const prefs = clonePreferences(searchPreferences)
      const { result: nextResult, pool } = applyPrefsToResult(data, prefs)
      setOfferPool(pool)
      setResult(nextResult)
      setCommand(data.command)
      setSessionFilters(prefs)
      setSettingsOpen(false)
      setHistoryOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('offerte.errors.unknown'))
    } finally {
      setHistoryLoading(false)
    }
  }, [searchPreferences])

  const handleSearchPreferencesSaved = useCallback((prefs: SearchPreferences) => {
    const cloned = clonePreferences(normalizePreferences(prefs))
    setSearchPreferences(cloned)
    setSessionFilters(cloned)
    if (result && offerPool.length > 0) {
      const { combined } = applySessionFiltersSplit(offerPool, cloned, sessionFilterOptions)
      const counts = countOffersByStatus(combined)
      setResult({
        ...result,
        offers: combined,
        preferences: cloned,
        ...counts,
      })
      setStatusFilter('all')
    } else if (result) {
      setResult({ ...result, preferences: cloned })
    }
  }, [result, offerPool, sessionFilterOptions])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('offerte_')) return
      applyPendingListRestore()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [applyPendingListRestore])

  useEffect(() => {
    billingApi.status().then(setBilling).catch(() => {}).finally(() => setBillingLoading(false))
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      routeHighlightAppliedRef.current = null
      applyOfferHighlightFromRoute()
    }
    applyOfferHighlightFromRoute()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [applyOfferHighlightFromRoute])

  useEffect(() => {
    if (offerPool.length === 0) return
    const route = parseRoute()
    if (!isDiscoverSearchRoute(route) || !route.highlightOfferId) return
    if (routeHighlightAppliedRef.current === route.highlightOfferId) return
    const target = offerPool.find((o) => o.id === route.highlightOfferId)
    if (!target) return
    if (target.applied) {
      routeHighlightAppliedRef.current = route.highlightOfferId
      return
    }
    routeHighlightAppliedRef.current = route.highlightOfferId
    applyOfferHighlightFromRoute()
  }, [offerPool, applyOfferHighlightFromRoute])

  useEffect(() => {
    loadLlmStats()
  }, [loadLlmStats])

  useEffect(() => {
    if (!canUseOfferte || !llmStats?.ready || bootstrapDoneRef.current) return
    bootstrapDoneRef.current = true

    offerteFetch<{ command_text: string; command: SearchCommand }>('/api/offerte/search/default')
      .then((data) => {
        if (!data.command) return
        setCommand({
          ...EMPTY_COMMAND,
          ...data.command,
          prompt_text: data.command_text ?? data.command.prompt_text ?? '',
        })
      })
      .catch(() => {})

    loadSearchPreferences().then(async (prefs) => {
      try {
        await loadHistory()
        if (applyPendingListRestore()) {
          return
        }
        const data = await offerteFetch<SearchResult | null>('/api/offerte/searches/latest')
        if (!data?.command) return
        const { result: nextResult, pool } = applyPrefsToResult(data, prefs)
        setOfferPool(pool)
        setResult(nextResult)
        setCommand({ ...EMPTY_COMMAND, ...data.command })
        setSessionFilters(clonePreferences(prefs))
        applyOfferHighlightFromRoute(pool, prefs, data.command)
      } catch {
        /* empty */
      }
    })
    loadHistory()
  }, [canUseOfferte, llmStats?.ready, loadHistory, loadSearchPreferences, applyPendingListRestore])

  useEffect(() => {
    const route = parseRoute()
    if (!isDiscoverSearchRoute(route) || !route.highlightOfferId) {
      setArchivedLiveOffer(null)
      setMissingLiveOfferId(null)
      setArchivedResolveDone(false)
      setArchivedModalOpen(false)
      dismissedArchivedModalRef.current = null
      return
    }
    if (!result && offerPool.length === 0) return

    const offerId = route.highlightOfferId
    if (offerPool.some((o) => o.id === offerId)) {
      setArchivedLiveOffer(null)
      setMissingLiveOfferId(null)
      setArchivedResolveDone(false)
      setArchivedModalOpen(false)
      return
    }

    if (dismissedArchivedModalRef.current !== offerId) {
      dismissedArchivedModalRef.current = null
    }

    setArchivedResolveDone(false)
    setMissingLiveOfferId(offerId)
    setHighlightOfferId(offerId)
    setPipelineView('valid')
    setStatusFilter('applied')
    if (route.trackerApplicationId) setTrackerLinkApplicationId(route.trackerApplicationId)

    let cancelled = false
    const finishResolve = () => {
      if (!cancelled) setArchivedResolveDone(true)
    }

    const resolveFromApplication = (app: Application) => {
      if (cancelled) return
      setMissingLiveOfferId(null)
      finishResolve()
      navigateToTracker({ applicationId: app.id })
    }

    if (route.trackerApplicationId) {
      getApplication(route.trackerApplicationId)
        .then(resolveFromApplication)
        .catch(() => {
          if (!cancelled) setArchivedLiveOffer(null)
          finishResolve()
        })
      return () => {
        cancelled = true
      }
    }

    getApplications({ exclude_rejected: false })
      .then((apps) => {
        const app = apps.find((a) => a.offerte_offer_id === offerId)
        if (app) resolveFromApplication(app)
        else {
          if (!cancelled) setArchivedLiveOffer(null)
          finishResolve()
        }
      })
      .catch(() => {
        if (!cancelled) setArchivedLiveOffer(null)
        finishResolve()
      })

    return () => {
      cancelled = true
    }
  }, [result, offerPool])

  useEffect(() => {
    if (!missingLiveOfferId || !archivedResolveDone || archivedLiveOffer) {
      setArchivedModalOpen(false)
      return
    }
    if (dismissedArchivedModalRef.current === missingLiveOfferId) {
      setArchivedModalOpen(false)
      return
    }
    setArchivedModalOpen(true)
  }, [archivedLiveOffer, missingLiveOfferId, archivedResolveDone])

  const handleArchivedModalOpenChange = useCallback((open: boolean) => {
    setArchivedModalOpen(open)
    if (!open && missingLiveOfferId) {
      dismissedArchivedModalRef.current = missingLiveOfferId
      setMissingLiveOfferId(null)
      navigate({ page: 'discover', tab: 'search', statusFilter: 'applied' }, true)
    }
  }, [missingLiveOfferId])

  const runSearch = useCallback(async () => {
    const promptText = (command.prompt_text ?? '').trim()
    if (!promptText) {
      setError(t('offerte.errors.emptyPrompt'))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setOfferteSearchPhase('parsing')
    const activePrefs = clonePreferences(searchPreferences)
    setSessionFilters(activePrefs)
    let searchCommand = command

    setParsing(true)
    try {
      const data = await offerteFetch<{ command: SearchCommand; used_llm: boolean }>('/api/offerte/search/parse', {
        method: 'POST',
        body: JSON.stringify({ prompt_text: promptText, command }),
      })
      searchCommand = data.command
      setCommand(data.command)
      await loadLlmStats()
    } catch (e) {
      setParsing(false)
      setLoading(false)
      setOfferteSearchPhase('idle')
      setError(e instanceof Error ? e.message : t('offerte.errors.parseFailed'))
      return
    } finally {
      setParsing(false)
    }

    setOfferteSearchPhase('searching')
    try {
      const payload: SearchRequest = { command: searchCommand, persist: true }
      const data = await offerteFetch<SearchResult>('/api/offerte/search', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const prefs = clonePreferences({
        ...(data.preferences ?? searchPreferences),
        sort_by: 'relevance',
      })
      const { result: nextResult, pool } = applyPrefsToResult(data, prefs)
      setOfferPool(pool)
      setResult(nextResult)
      setCommand(data.command)
      setSessionFilters(prefs)
      setStatusFilter('all')
      setPipelineView('valid')
      await loadHistory()
      const total = nextResult.total_found
      const dismissed = nextResult.dismissed_count ?? 0
      const active = total - dismissed
      if (dismissed > 0) {
        setSuccess(t('offerte.success.foundWithDismissed', { total, active, dismissed }))
      } else {
        setSuccess(t('offerte.success.found', { count: total }))
      }
      requestAnimationFrame(() => {
        document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('offerte.errors.unknown'))
    } finally {
      setLoading(false)
      setOfferteSearchPhase('idle')
    }
  }, [command, loadHistory, loadLlmStats, searchPreferences])

  const updateSessionFilters = useCallback((next: SearchPreferences) => {
    const cloned = clonePreferences(next)
    setSessionFilters(cloned)
    if (result && offerPool.length > 0) {
      const { combined } = applySessionFiltersSplit(offerPool, cloned, sessionFilterOptions)
      const counts = countOffersByStatus(combined)
      setResult({
        ...result,
        offers: combined,
        preferences: cloned,
        ...counts,
      })
      setStatusFilter('all')
    } else if (result) {
      setResult({ ...result, preferences: cloned })
    }
    void persistSearchPreferences(cloned).catch(() => {})
  }, [result, offerPool, persistSearchPreferences, sessionFilterOptions])

  const handleApply = useCallback((offer: JobOffer) => {
    setError(null)
    setSuccess(null)

    const applyUrl = resolveApplyUrl(offer)
    if (applyUrl) {
      window.open(applyUrl, '_blank')
    }
    openApplyModal(offer)
    setSuccess(t('offerte.success.openedInTab'))
  }, [openApplyModal])

  const handleMarkApplied = useCallback(async (offer: JobOffer) => {
    if (!result) return
    setError(null)
    setSuccess(null)
    try {
      const applyUrl = resolveApplyUrl(offer) || offer.apply_url
      const trackRes = await offerteFetch<{
        application_id: number
        created: boolean
        already_applied: boolean
        tracker_match?: ApplicationTrackerMatch | null
      }>(`/api/offerte/offers/${encodeURIComponent(offer.id)}/track`, {
        method: 'POST',
        body: JSON.stringify({
          company: offer.company,
          role: offer.role,
          apply_url: applyUrl,
          location: offer.location,
          source: offer.source ?? '',
          finalize: true,
        }),
      })
      const patchOffer = (o: JobOffer): JobOffer =>
        o.id === offer.id
          ? {
              ...o,
              applied: true,
              tracker_status: 'applied',
              applied_at: new Date().toISOString(),
              application_id: trackRes.application_id,
            }
          : o
      const nextPool = offerPool.map(patchOffer)
      const { combined } = applySessionFiltersSplit(nextPool, sessionFilters, sessionFilterOptions)
      const counts = countOffersByStatus(combined)
      setOfferPool(nextPool)
      setResult({
        ...result,
        offers: combined,
        preferences: sessionFilters,
        ...counts,
      })
      setTrackerLinkApplicationId(trackRes.application_id)
      publishOfferApplied({
        offerIds: [offer.id],
        applicationId: trackRes.application_id,
        company: offer.company,
        role: offer.role,
        applyUrl: applyUrl || offer.apply_url,
        appliedAt: new Date().toISOString(),
      })
      if (trackRes.already_applied && trackRes.tracker_match) {
        setDuplicateMatch(trackRes.tracker_match)
        setDuplicateModalOpen(true)
        setSuccess(null)
      } else {
        setSuccess(t('offerte.success.appliedFor', { company: offer.company }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('offerte.errors.trackFailed'))
    }
  }, [result, offerPool, sessionFilters])

  const handleReopenApply = useCallback((offer: JobOffer) => {
    const applyUrl = resolveApplyUrl(offer)
    if (applyUrl) {
      window.open(applyUrl, '_blank')
    }
    openApplyModal(offer)
  }, [openApplyModal])

  const applyDismissById = useCallback((offerId: string) => {
    if (!result) return
    const patchOffer = (o: JobOffer): JobOffer =>
      o.id === offerId ? { ...o, user_dismissed: true } : o
    const nextPool = offerPool.map(patchOffer)
    const { combined } = applySessionFiltersSplit(nextPool, sessionFilters, sessionFilterOptions)
    const counts = countOffersByStatus(combined)
    setOfferPool(nextPool)
    setResult({
      ...result,
      offers: combined,
      preferences: sessionFilters,
      ...counts,
    })
  }, [result, offerPool, sessionFilters, command])

  const applyAppliedSync = useCallback((payload: OfferAppliedSyncPayload) => {
    if (!result) return
    const patchOffer = (o: JobOffer): JobOffer => {
      if (!offerMatchesAppliedSync(o, payload)) return o
      return {
        ...o,
        applied: true,
        tracker_status: 'applied',
        applied_at: payload.appliedAt,
        application_id: payload.applicationId,
      }
    }
    const nextPool = offerPool.map(patchOffer)
    const { combined } = applySessionFiltersSplit(nextPool, sessionFilters, sessionFilterOptions)
    const counts = countOffersByStatus(combined)
    setOfferPool(nextPool)
    setResult({
      ...result,
      offers: combined,
      preferences: sessionFilters,
      ...counts,
    })
    const highlightId = payload.offerIds.find((id) => nextPool.some((o) => o.id === id))
    if (highlightId) setHighlightOfferId(highlightId)
  }, [result, offerPool, sessionFilters, command])

  const applyDismissSync = useCallback((payload: OfferDismissSyncPayload) => {
    if (!result) return
    const patchOffer = (o: JobOffer): JobOffer =>
      offerMatchesDismissSync(o, payload) ? { ...o, user_dismissed: true } : o
    const nextPool = offerPool.map(patchOffer)
    const { combined } = applySessionFiltersSplit(nextPool, sessionFilters, sessionFilterOptions)
    const counts = countOffersByStatus(combined)
    setOfferPool(nextPool)
    setResult({
      ...result,
      offers: combined,
      preferences: sessionFilters,
      ...counts,
    })
  }, [result, offerPool, sessionFilters, command])

  useEffect(() => {
    return subscribeOfferDismissed((payload) => {
      applyDismissSync(payload)
      setSuccess(t('offerte.success.dismissedFromAnnuncio'))
    })
  }, [applyDismissSync])

  useEffect(() => {
    return subscribeOfferApplied((payload) => {
      applyAppliedSync(payload)
      setSuccess(t('offerte.success.syncedFromAnnuncio'))
    })
  }, [applyAppliedSync])

  const handleAnalyze = useCallback((offer: JobOffer) => {
    openAnnuncioAnalyzeInNewTab(offer)
  }, [])

  const handleDismiss = useCallback(async (offer: JobOffer): Promise<boolean> => {
    if (!result) return false
    setError(null)
    setSuccess(null)
    try {
      await offerteFetch(`/api/offerte/offers/${encodeURIComponent(offer.id)}/dismissed`, {
        method: 'PUT',
        body: JSON.stringify({
          dismissed: true,
          apply_url: offer.apply_url,
          company: offer.company,
          role: offer.role,
        }),
      })
      applyDismissById(offer.id)
      publishOfferDismissed({
        offerIds: [offer.id],
        company: offer.company,
        role: offer.role,
        applyUrl: offer.apply_url,
      })
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : t('offerte.errors.dismissFailed'))
      return false
    }
  }, [result, applyDismissById])

  const handleApplyModalMarkApplied = useCallback(async () => {
    if (!applyModalOffer) return
    setApplyModalLoading(true)
    try {
      await handleMarkApplied(applyModalOffer)
      closeApplyModal()
    } finally {
      setApplyModalLoading(false)
    }
  }, [applyModalOffer, handleMarkApplied, closeApplyModal])

  const handleApplyModalDismiss = useCallback(async () => {
    if (!applyModalOffer) return
    setApplyModalLoading(true)
    try {
      const ok = await handleDismiss(applyModalOffer)
      if (ok) closeApplyModal()
    } finally {
      setApplyModalLoading(false)
    }
  }, [applyModalOffer, handleDismiss, closeApplyModal])

  const handleApplyModalReopen = useCallback(() => {
    if (!applyModalOffer) return
    const applyUrl = resolveApplyUrl(applyModalOffer)
    if (applyUrl) {
      window.open(applyUrl, '_blank')
      registerApplyTarget(applyUrl, `${applyModalOffer.company} · ${applyModalOffer.role}`, {
        company: applyModalOffer.company,
        role: applyModalOffer.role,
        offerId: applyModalOffer.id,
        location: applyModalOffer.location,
      })
    }
  }, [applyModalOffer])

  useEffect(() => {
    if (!applyModalOffer) return
    const fresh = offerPool.find((o) => o.id === applyModalOffer.id)
    if (fresh) {
      setApplyModalOffer(fresh)
      saveApplyModalOffer(fresh)
    }
  }, [offerPool, applyModalOffer?.id])

  const handleRestore = useCallback(async (offer: JobOffer) => {
    if (!result) return
    setError(null)
    setSuccess(null)
    try {
      await offerteFetch(`/api/offerte/offers/${encodeURIComponent(offer.id)}/dismissed`, {
        method: 'PUT',
        body: JSON.stringify({
          dismissed: false,
          apply_url: offer.apply_url,
          company: offer.company,
          role: offer.role,
        }),
      })
      const patchOffer = (o: JobOffer): JobOffer =>
        o.id === offer.id ? { ...o, user_dismissed: false } : o
      const nextPool = offerPool.map(patchOffer)
      const { combined } = applySessionFiltersSplit(nextPool, sessionFilters, sessionFilterOptions)
      const counts = countOffersByStatus(combined)
      setOfferPool(nextPool)
      setResult({
        ...result,
        offers: combined,
        preferences: sessionFilters,
        ...counts,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('offerte.errors.restoreFailed'))
    }
  }, [result, offerPool, sessionFilters])

  const { active: activeOffers, dismissed: dismissedOffers } = offerPool.length > 0
    ? applySessionFiltersSplit(offerPool, sessionFilters, sessionFilterOptions)
    : { active: [] as JobOffer[], dismissed: [] as JobOffer[] }
  const poolTotalCount = offerPool.length
  const appliedOffers = offerPool.filter((o) => !o.user_dismissed && isCompletedApplication(o))
  const appliedActiveCount = appliedOffers.length
  const maybeActiveCount = activeOffers.filter((o) => o.status === 'maybe').length
  const promptInterpretation = promptInterpretationItems(command)

  const validBucketOffers = statusFilter === 'applied'
    ? appliedOffers
    : activeOffers.filter((o) => statusFilter === 'all' || o.status === statusFilter)

  const bucketOffers = pipelineView === 'dismissed'
    ? dismissedOffers
    : validBucketOffers

  const filteredOffers = listSearchQuery.trim()
    ? bucketOffers.filter((o) => matchesOfferListSearch(o, listSearchQuery))
    : bucketOffers

  const tableOffers = archivedLiveOffer
    && pipelineView === 'valid'
    && statusFilter === 'applied'
    && (!listSearchQuery.trim() || matchesOfferListSearch(archivedLiveOffer, listSearchQuery))
    ? [archivedLiveOffer, ...filteredOffers.filter((o) => o.id !== archivedLiveOffer.id)]
    : filteredOffers

  const llmReady = llmStats?.ready === true

  const setupHint = (() => {
    if (!llmStats) return null
    if (llmStats.reason === 'missing_api_key') {
      return t('offerte.setup.missingApiKey')
    }
    if (llmStats.reason === 'missing_budget') {
      return t('offerte.setup.missingBudget')
    }
    return llmStats.access_message || null
  })()

  return (
    <div className="offerte-shell candidature-view">
      {!embedded && (
      <PlatformPageHeader
        title={t('offerte.title')}
        compact
        meta={
          <>
            {llmStats?.ready && llmStats.month_remaining_usd != null && (
              <span className="platform-chip" title={t('offerte.aiBudgetTitle', { spend: formatUsdSpend(llmStats.month_spend_usd), calls: llmStats.month_calls })}>
                AI {formatUsd(llmStats.month_remaining_usd)}
              </span>
            )}
            {result && (
              <span className="platform-chip">
                {new Date(result.searched_at).toLocaleString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </>
        }
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHistoryOpen(true)}>
              {t('offerte.history')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(true)}>
              {t('offerte.settings')}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigateToTracker()}>
              {t('offerte.tracker')}
            </button>
          </>
        }
      />
      )}

      <main className="offerte-app-main">
        {billingLoading && (
          <div className="offerte-setup-gate card">
            <p>{t('common.loading')}</p>
          </div>
        )}

        {!billingLoading && !canUseOfferte && <UpgradeGate />}

        {!billingLoading && canUseOfferte && !llmStats && !llmStatsError && (
          <div className="offerte-setup-gate card">
            <p>{t('common.loading')}</p>
          </div>
        )}

        {!billingLoading && canUseOfferte && llmStatsError && (
          <div className="offerte-setup-gate card">
            <p>{llmStatsError}</p>
            <button type="button" className="offerte-settings-btn" onClick={loadLlmStats}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {!billingLoading && canUseOfferte && llmStats && !llmReady && (
          <div className="offerte-setup-gate card">
            <h3>{t('offerte.configureGemini')}</h3>
            {setupHint && <p className="offerte-setup-hint">{setupHint}</p>}
            <button type="button" className="offerte-settings-btn" onClick={() => setSettingsOpen(true)}>
              {t('offerte.openSettings')}
            </button>
          </div>
        )}

        {!billingLoading && canUseOfferte && llmReady && (
          <>
            <SearchPanel
              command={command}
              onChange={setCommand}
              onSearch={runSearch}
              loading={loading}
              parsing={parsing}
              interpretationItems={promptInterpretation}
            />

            {error && <div className="offerte-inline-alert offerte-inline-alert-error">{error}</div>}
            {success && !error && (
              <div className="offerte-inline-alert offerte-inline-alert-success">
                <span>{success}</span>
                {trackerLinkApplicationId != null && (
                  <button
                    type="button"
                    className="pipeline-link-btn pipeline-link-btn-secondary"
                    onClick={() => navigateToTracker({ applicationId: trackerLinkApplicationId })}
                  >
                    {t('common.openInTracker')}
                  </button>
                )}
              </div>
            )}

            {result ? (
              <div className="results-section">
                <OffersListToolbar
                  filters={sessionFilters}
                  onFiltersChange={updateSessionFilters}
                  listSearchQuery={listSearchQuery}
                  onListSearchChange={setListSearchQuery}
                  visibleCount={filteredOffers.length}
                  candidabiliCount={activeOffers.length}
                  appliedCount={appliedActiveCount}
                  maybeCount={maybeActiveCount}
                  dismissedCount={dismissedOffers.length}
                  activeView={pipelineView}
                  statusFilter={statusFilter}
                  onSelectCandidabili={() => {
                    setPipelineView('valid')
                    setStatusFilter('all')
                  }}
                  onSelectApplied={() => {
                    setPipelineView('valid')
                    setStatusFilter('applied')
                  }}
                  onSelectMaybe={() => {
                    setPipelineView('valid')
                    setStatusFilter('maybe')
                  }}
                  onSelectDismissed={() => {
                    setPipelineView('dismissed')
                    setStatusFilter('dismissed')
                  }}
                />

                <div className="offers-table-shell">
                  <OffersTable
                    offers={tableOffers}
                    paginationResetKey={`${pipelineView}:${statusFilter}:${listSearchQuery}:${archivedLiveOffer?.id ?? ''}`}
                    highlightOfferId={highlightOfferId}
                    onHighlightDone={() => setHighlightOfferId(null)}
                    onApply={handleApply}
                    onMarkApplied={handleMarkApplied}
                    onReopenApply={handleReopenApply}
                    onDismiss={handleDismiss}
                    onAnalyze={handleAnalyze}
                    onRestore={handleRestore}
                    onViewInTracker={(applicationId) => navigateToTracker({ applicationId })}
                    showDismissed={pipelineView === 'dismissed'}
                  />
                </div>

                {filteredOffers.length === 0 && !archivedLiveOffer && poolTotalCount > 0 && (
                  <div className="offerte-filter-empty card">
                    <p>
                      {listSearchQuery.trim()
                        ? t('offerte.filterEmpty.search')
                        : pipelineView === 'dismissed'
                        ? t('offerte.filterEmpty.dismissed')
                        : statusFilter === 'applied'
                        ? t('offerte.filterEmpty.applied')
                        : t('offerte.filterEmpty.default')}
                    </p>
                  </div>
                )}
              </div>
            ) : !loading ? (
              <div className="empty-state">
                <h2>{t('offerte.emptyTitle')}</h2>
                <p>{t('offerte.emptyDescription')}</p>
              </div>
            ) : null}
          </>
        )}
      </main>

      <OfferteSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        stats={llmStats}
        searchPreferences={searchPreferences}
        onSearchPreferencesChange={setSearchPreferences}
        onSearchPreferencesSaved={handleSearchPreferencesSaved}
        onRefreshStats={loadLlmStats}
        onBudgetChange={updateLlmBudget}
        onControlsChange={updateLlmControls}
        onSuccess={setSuccess}
      />

      <OfferteHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        currentSearchId={result?.id}
        loading={historyLoading}
        onSelect={loadSearch}
      />

      <DuplicateApplicationModal
        open={duplicateModalOpen}
        match={duplicateMatch}
        mode="live"
        onClose={() => setDuplicateModalOpen(false)}
        onOpenTracker={(applicationId) => {
          setDuplicateModalOpen(false)
          navigateToTracker({ applicationId })
        }}
      />

      <OfferApplyModal
        open={applyModalOpen}
        offer={applyModalOffer}
        applyUrl={applyModalOffer ? resolveApplyUrl(applyModalOffer) || applyModalOffer.apply_url : ''}
        loading={applyModalLoading}
        onClose={closeApplyModal}
        onMarkApplied={handleApplyModalMarkApplied}
        onDismiss={handleApplyModalDismiss}
        onReopenApply={handleApplyModalReopen}
      />

      <ArchivedLiveOfferDialog
        open={archivedModalOpen}
        onOpenChange={handleArchivedModalOpenChange}
        archivedOffer={archivedLiveOffer}
        trackerApplicationId={trackerLinkApplicationId}
        onOpenTracker={(applicationId) => navigateToTracker({ applicationId })}
      />

    </div>
  )
}
