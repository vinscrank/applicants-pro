import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { JobUrlAnalysis, LiveOfferMatch } from './types'
import type { RemoteType } from '../types'
import type { ApplicationTrackerMatch } from '../applications/trackerMatch'
import { remoteLabel as remoteLabelI18n } from '../i18n/labels'
import { offerteFetch } from '../offerte/api'
import { markOfferteDismissRestore } from '../offerte/offerteListSession'
import { publishOfferDismissed, publishOfferApplied, subscribeOfferApplied, subscribeOfferDismissed, offerMatchesAppliedSync, offerMatchesDismissSync } from '../offerte/offerteSyncChannel'
import { parseRoute, isDiscoverUrlRoute } from '../router'
import { UpgradeGate } from '../offerte/components/UpgradeGate'
import { billingApi, type BillingStatus } from '../billing/api'
import { PlatformPageHeader } from '../layout/PlatformPageHeader'
import { navigateToTracker, navigateToOfferteLive } from '../pipeline/pipelineBridge'
import { DuplicateApplicationModal } from '../components/DuplicateApplicationModal'
import { ProfileFitBadge } from '../offerte/components/ProfileFitBadge'
import { AnnuncioApplyPanel } from './AnnuncioApplyPanel'
import { TrackerAppliedWidget } from './TrackerAppliedWidget'
import { AnnuncioJobFrame } from './AnnuncioJobFrame'
import { registerApplyTarget } from '../apply/extensionBridge'
import '../offerte/offerte-theme.css'
import '../components/DuplicateApplicationModal.css'
import './annuncio.css'

const SOURCE_TAGS = ['LinkedIn', 'Greenhouse', 'Lever', 'Stripe', 'Workable', 'Ashby']

function mapRemoteType(value: string): RemoteType {
  if (value === 'remote' || value === 'hybrid' || value === 'onsite') return value
  return 'unknown'
}

function remoteLabel(value: string): string {
  return remoteLabelI18n(mapRemoteType(value))
}

function trackerNotes(analysis: JobUrlAnalysis): string {
  const parts = ['Analisi annuncio · candidatura inviata', analysis.review]
  if (analysis.summary) parts.push(analysis.summary)
  return parts.filter(Boolean).join('\n\n')
}

interface TrackAnalyzedUrlResponse {
  application_id: number
  created: boolean
  already_applied: boolean
  tracker_match?: ApplicationTrackerMatch | null
  live_offer_matches?: LiveOfferMatch[]
}

function dismissOfferIdForAnalysis(analysis: JobUrlAnalysis): string {
  const liveId = analysis.live_offer_matches?.find((match) => !match.dismissed)?.offer_id
  if (liveId) return liveId
  let hash = 0
  for (let i = 0; i < analysis.url.length; i += 1) {
    hash = ((hash << 5) - hash + analysis.url.charCodeAt(i)) | 0
  }
  return `ann${Math.abs(hash).toString(36).slice(0, 9)}`
}

function publishLiveAppliedSync(
  analysis: JobUrlAnalysis,
  sourceOfferId: string | null,
  applicationId: number,
  liveMatches: LiveOfferMatch[] | undefined,
) {
  const liveIds = (liveMatches ?? []).map((match) => match.offer_id)
  const offerIds = [...new Set([sourceOfferId, ...liveIds].filter(Boolean) as string[])]
  publishOfferApplied({
    offerIds,
    applicationId,
    company: analysis.company.trim(),
    role: analysis.role.trim(),
    applyUrl: analysis.url,
    appliedAt: new Date().toISOString(),
  })
}

function AnnuncioLoadingCard() {
  const { t } = useTranslation()

  return (
    <section className="annuncio-loading card" aria-busy="true" aria-label={t('annuncio.loadingAria')}>
      <div className="annuncio-loading-head">
        <span className="spinner" />
        {t('annuncio.analyzing')}
      </div>
      <div className="annuncio-skeleton-line w60" />
      <div className="annuncio-skeleton-line w40" />
      <div className="annuncio-skeleton-grid">
        <div className="annuncio-skeleton-block" />
        <div className="annuncio-skeleton-block" />
        <div className="annuncio-skeleton-block" />
      </div>
      <div className="annuncio-skeleton-line w80" />
      <div className="annuncio-skeleton-line w80" />
    </section>
  )
}

function AnnuncioEmptyState() {
  const { t } = useTranslation()

  return (
    <section className="annuncio-empty card">
      <h2 className="annuncio-empty-title">{t('annuncio.emptyTitle')}</h2>
      <p className="annuncio-empty-text">{t('annuncio.emptyDescription')}</p>
      <div className="annuncio-steps">
        <div className="annuncio-step">
          <span className="annuncio-step-num">1</span>
          <span className="annuncio-step-title">{t('annuncio.step1Title')}</span>
          <span className="annuncio-step-text">{t('annuncio.step1Text')}</span>
        </div>
        <div className="annuncio-step">
          <span className="annuncio-step-num">2</span>
          <span className="annuncio-step-title">{t('annuncio.step2Title')}</span>
          <span className="annuncio-step-text">{t('annuncio.step2Text')}</span>
        </div>
        <div className="annuncio-step">
          <span className="annuncio-step-num">3</span>
          <span className="annuncio-step-title">{t('annuncio.step3Title')}</span>
          <span className="annuncio-step-text">{t('annuncio.step3Text')}</span>
        </div>
      </div>
    </section>
  )
}

export default function AnnuncioView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<JobUrlAnalysis | null>(null)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [trackerApplicationId, setTrackerApplicationId] = useState<number | null>(null)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicateMatch, setDuplicateMatch] = useState<ApplicationTrackerMatch | null>(null)
  const [dismissLoading, setDismissLoading] = useState(false)
  const [dismissedLocally, setDismissedLocally] = useState(false)
  const [sourceOfferId, setSourceOfferId] = useState<string | null>(null)
  const autoAnalyzeStarted = useRef(false)

  const canUse = billing?.features.offerte_live === true

  useEffect(() => {
    const route = parseRoute()
    if (!isDiscoverUrlRoute(route)) return
    if (route.analyzeUrl) setUrl(route.analyzeUrl)
    if (route.sourceOfferId) setSourceOfferId(route.sourceOfferId)
  }, [])

  const runAnalyze = useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim()
    if (!trimmed) {
      setError(t('annuncio.pasteUrlError'))
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setTrackerApplicationId(null)
    setDismissedLocally(false)
    setAnalysis(null)
    try {
      const data = await offerteFetch<JobUrlAnalysis>('/api/offerte/analyze-url', {
        method: 'POST',
        body: JSON.stringify({ url: trimmed }),
      })
      setAnalysis(data)
      registerApplyTarget(data.url, `${data.company} · ${data.role}`)
    } catch (e) {
      setAnalysis(null)
      setError(e instanceof Error ? e.message : t('errors.analysisFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canUse || billingLoading || autoAnalyzeStarted.current) return
    const route = parseRoute()
    if (!isDiscoverUrlRoute(route) || !route.autoAnalyze || !route.analyzeUrl) return
    autoAnalyzeStarted.current = true
    void runAnalyze(route.analyzeUrl)
  }, [canUse, billingLoading, runAnalyze])

  const analyze = useCallback(async () => {
    await runAnalyze(url)
  }, [runAnalyze, url])

  useEffect(() => {
    billingApi.status().then(setBilling).catch(() => setBilling(null)).finally(() => setBillingLoading(false))
  }, [])

  useEffect(() => {
    return subscribeOfferApplied((payload) => {
      setAnalysis((current) => {
        if (!current) return current
        const probe = {
          id: sourceOfferId || dismissOfferIdForAnalysis(current),
          company: current.company,
          role: current.role,
          apply_url: current.url,
        }
        if (!offerMatchesAppliedSync(probe, payload)) return current
        setTrackerApplicationId(payload.applicationId)
        return {
          ...current,
          live_offer_matches: (current.live_offer_matches ?? []).map((match) =>
            offerMatchesAppliedSync(
              { id: match.offer_id, company: match.company, role: match.role, apply_url: match.apply_url },
              payload,
            )
              ? { ...match, applied: true }
              : match,
          ),
        }
      })
    })
  }, [sourceOfferId])

  useEffect(() => {
    return subscribeOfferDismissed((payload) => {
      setAnalysis((current) => {
        if (!current) return current
        const probe = {
          id: sourceOfferId || dismissOfferIdForAnalysis(current),
          company: current.company,
          role: current.role,
          apply_url: current.url,
        }
        if (!offerMatchesDismissSync(probe, payload)) return current
        setDismissedLocally(true)
        return {
          ...current,
          live_offer_matches: (current.live_offer_matches ?? []).map((match) =>
            offerMatchesDismissSync(
              { id: match.offer_id, company: match.company, role: match.role, apply_url: match.apply_url },
              payload,
            )
              ? { ...match, dismissed: true }
              : match,
          ),
        }
      })
    })
  }, [sourceOfferId])

  const addToTracker = useCallback(async (allowDuplicate = false) => {
    if (!analysis) return
    if (!analysis.company.trim() || !analysis.role.trim()) {
      setError(t('annuncio.missingFieldsError'))
      return
    }
    if (!allowDuplicate && analysis.tracker_match) {
      setDuplicateMatch(analysis.tracker_match)
      setDuplicateModalOpen(true)
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await offerteFetch<TrackAnalyzedUrlResponse>('/api/offerte/analyze-url/track', {
        method: 'POST',
        body: JSON.stringify({
          url: analysis.url,
          company: analysis.company.trim(),
          role: analysis.role.trim(),
          location: analysis.location.trim(),
          application_method: analysis.application_method,
          remote_type: mapRemoteType(analysis.remote_type),
          notes: trackerNotes(analysis),
          allow_duplicate: allowDuplicate,
        }),
      })
      if (res.already_applied && res.tracker_match && !allowDuplicate) {
        publishLiveAppliedSync(analysis, sourceOfferId, res.application_id, res.live_offer_matches)
        setDuplicateMatch(res.tracker_match)
        setDuplicateModalOpen(true)
        setAnalysis((current) => (current ? { ...current, tracker_match: res.tracker_match } : current))
        return
      }
      publishLiveAppliedSync(analysis, sourceOfferId, res.application_id, res.live_offer_matches)
      setTrackerApplicationId(res.application_id)
      setDuplicateModalOpen(false)
      setDuplicateMatch(null)
      setAnalysis((current) =>
        current
          ? {
              ...current,
              tracker_match: res.tracker_match ?? null,
              live_offer_matches: (res.live_offer_matches ?? current.live_offer_matches ?? []).map((match) => ({
                ...match,
                applied: true,
              })),
            }
          : current,
      )
      const syncedLive = (res.live_offer_matches ?? []).length
      setSuccess(
        allowDuplicate
          ? syncedLive > 0
            ? t('annuncio.success.duplicateWithSync', { count: syncedLive })
            : t('annuncio.success.duplicateAdded')
          : syncedLive > 0
            ? t('annuncio.success.addedWithSync', { count: syncedLive })
            : t('annuncio.success.added'),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.genericSave'))
    } finally {
      setSaving(false)
    }
  }, [analysis, sourceOfferId])

  const alreadyDismissed =
    dismissedLocally ||
    Boolean(analysis?.user_dismissed) ||
    Boolean(
      analysis?.live_offer_matches?.length &&
      analysis.live_offer_matches.every((match) => match.dismissed),
    )

  const handleDismiss = useCallback(async () => {
    if (!analysis || alreadyDismissed) return
    setDismissLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const offerId = dismissOfferIdForAnalysis(analysis)
      await offerteFetch(`/api/offerte/offers/${encodeURIComponent(offerId)}/dismissed`, {
        method: 'PUT',
        body: JSON.stringify({
          dismissed: true,
          apply_url: analysis.url,
          company: analysis.company.trim(),
          role: analysis.role.trim(),
        }),
      })
      markOfferteDismissRestore(offerId)
      const liveIds = (analysis.live_offer_matches ?? []).map((match) => match.offer_id)
      const offerIds = [...new Set([sourceOfferId, offerId, ...liveIds].filter(Boolean) as string[])]
      publishOfferDismissed({
        offerIds,
        company: analysis.company.trim(),
        role: analysis.role.trim(),
        applyUrl: analysis.url,
      })
      setDismissedLocally(true)
      setAnalysis((current) =>
        current
          ? {
              ...current,
              user_dismissed: true,
              live_offer_matches: (current.live_offer_matches ?? []).map((match) => ({
                ...match,
                dismissed: true,
              })),
            }
          : current,
      )
      setSuccess(t('annuncio.success.dismissed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.dismissFailed'))
    } finally {
      setDismissLoading(false)
    }
  }, [analysis, alreadyDismissed, sourceOfferId])

  const handleCreateDuplicate = useCallback(async () => {
    setDuplicateModalOpen(false)
    await addToTracker(true)
  }, [addToTracker])

  if (billingLoading) {
    return <div className="annuncio-shell"><p className="annuncio-muted">{t('common.loading')}</p></div>
  }

  if (!canUse) {
    return (
      <div className="annuncio-shell candidature-view">
        <UpgradeGate />
      </div>
    )
  }

  const hasSideInsights = analysis && (analysis.highlights.length > 0 || analysis.concerns.length > 0)
  const primaryLiveOffer = analysis?.live_offer_matches?.[0] ?? null

  return (
    <div className={`annuncio-shell candidature-view${analysis && !loading ? ' annuncio-shell-workspace' : ''}`}>
      {!embedded && (
      <PlatformPageHeader
        title={t('annuncio.title')}
        subtitle={t('annuncio.subtitle')}
      />
      )}
      <section className="annuncio-search card">
        <div className="annuncio-search-top">
          <div className="annuncio-search-copy">
            <h2>{t('annuncio.analyzeLinkTitle')}</h2>
            <p>{t('annuncio.analyzeLinkLead')}</p>
          </div>
          <span className="annuncio-search-badge">AI</span>
        </div>
        <div className="annuncio-search-input-wrap">
          <input
            id="annuncio-url"
            type="url"
            className="annuncio-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('annuncio.urlPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading) {
                e.preventDefault()
                analyze()
              }
              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !loading) analyze()
            }}
          />
          <button type="button" className="btn btn-primary annuncio-analyze-btn" onClick={analyze} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                {t('common.analyzing')}
              </>
            ) : (
              t('annuncio.analyze')
            )}
          </button>
        </div>
        <div className="annuncio-search-foot">
          <div className="annuncio-source-tags">
            {SOURCE_TAGS.map((tag) => (
              <span key={tag} className="annuncio-source-tag">{tag}</span>
            ))}
          </div>
          <span className="annuncio-kbd-hint">{t('annuncio.keyboardHint')}</span>
        </div>
      </section>

      {error && <div className="error-banner annuncio-status-banner">{error}</div>}
      {success && (
        <div className="success-banner success-banner-with-action annuncio-status-banner">
          <span>{success}</span>
          {trackerApplicationId != null && (
            <button
              type="button"
              className="pipeline-link-btn pipeline-link-btn-secondary"
              onClick={() => navigateToTracker({ applicationId: trackerApplicationId })}
            >
              {t('common.openInTracker')}
            </button>
          )}
        </div>
      )}

      {loading && <AnnuncioLoadingCard />}
      {!loading && !analysis && !error && <AnnuncioEmptyState />}

      {analysis && !loading && (
        <>
          {analysis.tracker_match && (
            <TrackerAppliedWidget
              match={analysis.tracker_match}
              sessionKey={analysis.url}
              side="right"
              onOpenTracker={() => navigateToTracker({ applicationId: analysis.tracker_match!.application_id })}
            />
          )}
        <div className="annuncio-workspace">
          <aside className="annuncio-workspace-side">
            <article className="annuncio-result card annuncio-result-compact">
              <header className="annuncio-hero annuncio-hero-compact">
                <div className="annuncio-hero-main">
                  <span className="annuncio-origin-badge">{analysis.origin_label}</span>
                  <h2 className="annuncio-company">{analysis.company || t('annuncio.companyUnknown')}</h2>
                  <p className="annuncio-role">{analysis.role || t('annuncio.roleUnknown')}</p>
                  <ProfileFitBadge
                    score={analysis.profile_fit_score}
                    label={analysis.profile_fit_label}
                    available={analysis.profile_fit_available}
                  />
                </div>
              </header>

              <div className="annuncio-body annuncio-body-compact">
                <div className="annuncio-meta-row annuncio-meta-row-compact">
                  <div className="annuncio-meta-item">
                    <span className="annuncio-meta-label">{t('annuncio.location')}</span>
                    <span className={`annuncio-meta-value${analysis.location ? '' : ' annuncio-meta-value-muted'}`}>
                      {analysis.location || t('annuncio.notIndicated')}
                    </span>
                  </div>
                  <div className="annuncio-meta-item">
                    <span className="annuncio-meta-label">{t('annuncio.modality')}</span>
                    <span className="annuncio-meta-value">{remoteLabel(analysis.remote_type)}</span>
                  </div>
                </div>

                {primaryLiveOffer && (
                  <div className="annuncio-live-offer-banner annuncio-banner-compact">
                    <div className="annuncio-live-offer-copy">
                      <strong>
                        {primaryLiveOffer.applied
                          ? t('annuncio.alreadyAppliedLive')
                          : t('annuncio.presentLive')}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="pipeline-link-btn pipeline-link-btn-secondary"
                      onClick={() =>
                        navigateToOfferteLive({
                          highlightOfferId: primaryLiveOffer.offer_id,
                          statusFilter: primaryLiveOffer.applied ? 'applied' : undefined,
                        })
                      }
                    >
                      {t('annuncio.liveOffers')}
                    </button>
                  </div>
                )}

                <div className={`annuncio-content-grid${hasSideInsights ? '' : ' annuncio-content-grid-single'}`}>
                  <section className="annuncio-panel-block annuncio-panel-block-review">
                    {analysis.summary && (
                      <>
                        <h3 className="annuncio-block-title">{t('annuncio.summary')}</h3>
                        <p className="annuncio-block-text">{analysis.summary}</p>
                      </>
                    )}
                    {analysis.review && (
                      <>
                        <h3 className="annuncio-block-title">{t('annuncio.aiReview')}</h3>
                        <p className="annuncio-block-text">{analysis.review}</p>
                      </>
                    )}
                  </section>

                  {hasSideInsights && (
                    <aside className="annuncio-panel-block annuncio-panel-block-side">
                      {analysis.highlights.length > 0 && (
                        <div className="annuncio-side-section">
                          <h3 className="annuncio-block-title">{t('annuncio.highlights')}</h3>
                          <ul className="annuncio-insight-list">
                            {analysis.highlights.map((item) => (
                              <li key={item} className="annuncio-insight-item">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {analysis.concerns.length > 0 && (
                        <div className="annuncio-side-section">
                          <h3 className="annuncio-block-title">{t('annuncio.concerns')}</h3>
                          <ul className="annuncio-insight-list annuncio-insight-list-warn">
                            {analysis.concerns.map((item) => (
                              <li key={item} className="annuncio-insight-item">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </aside>
                  )}
                </div>
              </div>
            </article>

            <AnnuncioApplyPanel
              analysis={analysis}
              saving={saving}
              dismissLoading={dismissLoading}
              alreadyDismissed={alreadyDismissed}
              trackerApplicationId={trackerApplicationId}
              onMarkApplied={() => addToTracker(false)}
              onDismiss={handleDismiss}
              onOpenTracker={(applicationId) => navigateToTracker({ applicationId })}
            />
          </aside>

          <section className="annuncio-workspace-frame card">
            <AnnuncioJobFrame url={analysis.url} />
          </section>
        </div>
        </>
      )}

      <DuplicateApplicationModal
        open={duplicateModalOpen}
        match={duplicateMatch}
        mode="annuncio"
        saving={saving}
        onClose={() => setDuplicateModalOpen(false)}
        onOpenTracker={(applicationId) => {
          setDuplicateModalOpen(false)
          navigateToTracker({ applicationId })
        }}
        onCreateDuplicate={handleCreateDuplicate}
      />
    </div>
  )
}
