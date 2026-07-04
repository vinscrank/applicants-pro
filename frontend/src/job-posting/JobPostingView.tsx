import { useState, useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { JobUrlAnalysis, LiveOfferMatch } from './types'
import type { RemoteType } from '../types'
import type { ApplicationTrackerMatch } from '../applications/trackerMatch'
import { formatTrackerMatchDate, trackerMatchStatusLabel } from '../applications/trackerMatch'
import { remoteLabel as remoteLabelI18n } from '../i18n/labels'
import { jobsFetch } from '../jobs/api'
import { markJobsDismissRestore } from '../jobs/jobsListSession'
import { publishOfferDismissed, publishOfferApplied, subscribeOfferApplied, subscribeOfferDismissed, offerMatchesAppliedSync, offerMatchesDismissSync } from '../jobs/jobsSyncChannel'
import { parseRoute, isDiscoverUrlRoute } from '../router'
import { UpgradeGate } from '../jobs/components/UpgradeGate'
import { billingApi, type BillingStatus } from '../billing/api'
import { PlatformPageHeader } from '../layout/PlatformPageHeader'
import { navigateToTracker, navigateToJobs } from '../pipeline/pipelineBridge'
import { DuplicateApplicationModal } from '../components/DuplicateApplicationModal'
import { ProfileFitFeedback } from '../jobs/components/ProfileFitFeedback'
import { JobPostingApplyPanel } from './JobPostingApplyPanel'
import { JobPostingFrame } from './JobPostingFrame'
import { registerApplyTarget } from '../apply/extensionBridge'
import '../jobs/jobs-theme.css'
import '../components/DuplicateApplicationModal.css'
import './job-posting.css'

const SOURCE_TAGS = ['LinkedIn', 'Greenhouse', 'Lever', 'Stripe', 'Workable', 'Ashby']

function mapRemoteType(value: string): RemoteType {
  if (value === 'remote' || value === 'hybrid' || value === 'onsite') return value
  return 'unknown'
}

function remoteLabel(value: string): string {
  return remoteLabelI18n(mapRemoteType(value))
}

function trackerNotes(analysis: JobUrlAnalysis): string {
  const parts = ['Job posting analysis · application submitted', analysis.review]
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

function JobPostingLoadingCard() {
  const { t } = useTranslation()

  return (
    <section className="job-posting-loading card" aria-busy="true" aria-label={t('jobPosting.loadingAria')}>
      <div className="job-posting-loading-head">
        <span className="spinner" />
        {t('jobPosting.analyzing')}
      </div>
      <div className="job-posting-skeleton-line w60" />
      <div className="job-posting-skeleton-line w40" />
      <div className="job-posting-skeleton-grid">
        <div className="job-posting-skeleton-block" />
        <div className="job-posting-skeleton-block" />
        <div className="job-posting-skeleton-block" />
      </div>
      <div className="job-posting-skeleton-line w80" />
      <div className="job-posting-skeleton-line w80" />
    </section>
  )
}

function JobPostingEmptyState() {
  const { t } = useTranslation()

  return (
    <section className="job-posting-empty card">
      <h2 className="job-posting-empty-title">{t('jobPosting.emptyTitle')}</h2>
      <p className="job-posting-empty-text">{t('jobPosting.emptyDescription')}</p>
    </section>
  )
}

export default function JobPostingView({ embedded = false }: { embedded?: boolean } = {}) {
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

  const canUse = billing?.features.live_jobs === true

  useEffect(() => {
    const route = parseRoute()
    if (!isDiscoverUrlRoute(route)) return
    if (route.analyzeUrl) setUrl(route.analyzeUrl)
    if (route.sourceOfferId) setSourceOfferId(route.sourceOfferId)
  }, [])

  const runAnalyze = useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim()
    if (!trimmed) {
      setError(t('jobPosting.pasteUrlError'))
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setTrackerApplicationId(null)
    setDismissedLocally(false)
    setAnalysis(null)
    try {
      const data = await jobsFetch<JobUrlAnalysis>('/api/jobs/analyze-url', {
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
      setError(t('jobPosting.missingFieldsError'))
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
      const res = await jobsFetch<TrackAnalyzedUrlResponse>('/api/jobs/analyze-url/track', {
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
            ? t('jobPosting.success.duplicateWithSync', { count: syncedLive })
            : t('jobPosting.success.duplicateAdded')
          : syncedLive > 0
            ? t('jobPosting.success.addedWithSync', { count: syncedLive })
            : t('jobPosting.success.added'),
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
      await jobsFetch(`/api/jobs/offers/${encodeURIComponent(offerId)}/dismissed`, {
        method: 'PUT',
        body: JSON.stringify({
          dismissed: true,
          apply_url: analysis.url,
          company: analysis.company.trim(),
          role: analysis.role.trim(),
        }),
      })
      markJobsDismissRestore(offerId)
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
      setSuccess(t('jobPosting.success.dismissed'))
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
    return <div className="job-posting-shell"><p className="job-posting-muted">{t('common.loading')}</p></div>
  }

  if (!canUse) {
    return (
      <div className="job-posting-shell candidature-view">
        <UpgradeGate />
      </div>
    )
  }

  const primaryLiveOffer = analysis?.live_offer_matches?.[0] ?? null

  return (
    <div className={`job-posting-shell candidature-view${analysis && !loading ? ' job-posting-shell-workspace' : ''}`}>
      {!embedded && !analysis && (
      <PlatformPageHeader
        title={t('jobPosting.title')}
        subtitle={t('jobPosting.subtitle')}
      />
      )}
      <section className={`job-posting-search card${analysis ? ' job-posting-search-compact' : ''}`}>
        {!analysis && (
        <div className="job-posting-search-top">
          <div className="job-posting-search-copy">
            <h2>{t('jobPosting.analyzeLinkTitle')}</h2>
            <p>{t('jobPosting.analyzeLinkLead')}</p>
          </div>
          <span className="job-posting-search-badge">AI</span>
        </div>
        )}
        <div className="job-posting-search-input-wrap">
          <input
            id="job-posting-url"
            type="url"
            className="job-posting-url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('jobPosting.urlPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading) {
                e.preventDefault()
                analyze()
              }
              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !loading) analyze()
            }}
          />
          <button type="button" className="btn btn-primary job-posting-analyze-btn" onClick={analyze} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" />
                {t('common.analyzing')}
              </>
            ) : (
              t('jobPosting.analyze')
            )}
          </button>
        </div>
        <div className="job-posting-search-foot">
          {!analysis && (
          <div className="job-posting-source-tags">
            {SOURCE_TAGS.map((tag) => (
              <span key={tag} className="job-posting-source-tag">{tag}</span>
            ))}
          </div>
          )}
          <span className="job-posting-kbd-hint">{t('jobPosting.keyboardHint')}</span>
        </div>
      </section>

      {error && <div className="error-banner job-posting-status-banner">{error}</div>}
      {success && (
        <div className="success-banner success-banner-with-action job-posting-status-banner">
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

      {loading && <JobPostingLoadingCard />}
      {!loading && !analysis && !error && <JobPostingEmptyState />}

      {analysis && !loading && (
        <div className="job-posting-workspace">
          <aside className="job-posting-workspace-rail card">
            <header className="job-posting-rail-head">
              <span className="job-posting-origin-badge">{analysis.origin_label}</span>
              <h2 className="job-posting-rail-company">{analysis.company || t('jobPosting.companyUnknown')}</h2>
              <p className="job-posting-rail-role">{analysis.role || t('jobPosting.roleUnknown')}</p>
              <p className="job-posting-rail-meta">
                {[analysis.location || t('jobPosting.notIndicated'), remoteLabel(analysis.remote_type)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <ProfileFitFeedback offer={analysis} />
            </header>

            {analysis.tracker_match && (
              <div className="job-posting-rail-tracker-banner">
                <div className="job-posting-rail-tracker-copy">
                  <strong>{t('jobPosting.trackerBannerTitle')}</strong>
                  <span>
                    {trackerMatchStatusLabel(analysis.tracker_match.status)}
                    {formatTrackerMatchDate(analysis.tracker_match.last_applied_at)
                      ? ` · ${formatTrackerMatchDate(analysis.tracker_match.last_applied_at)}`
                      : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="job-posting-rail-tracker-link"
                  onClick={() => navigateToTracker({ applicationId: analysis.tracker_match!.application_id })}
                >
                  {t('jobPosting.trackerBannerAction')}
                </button>
              </div>
            )}

            {primaryLiveOffer && (
              <div className="job-posting-rail-live-banner">
                <span className="job-posting-rail-live-copy">
                  {primaryLiveOffer.applied
                    ? t('jobPosting.alreadyAppliedLive')
                    : t('jobPosting.presentLive')}
                </span>
                <button
                  type="button"
                  className="job-posting-rail-live-link"
                  onClick={() =>
                    navigateToJobs({
                      highlightOfferId: primaryLiveOffer.offer_id,
                      statusFilter: primaryLiveOffer.applied ? 'applied' : undefined,
                    })
                  }
                >
                  {t('jobPosting.liveOffers')}
                </button>
              </div>
            )}

            <div className="job-posting-rail-scroll">
              {analysis.summary && (
                <section className="job-posting-rail-section">
                  <h3 className="job-posting-rail-section-title">{t('jobPosting.summary')}</h3>
                  <p className="job-posting-rail-section-text">{analysis.summary}</p>
                </section>
              )}
              {analysis.review && (
                <section className="job-posting-rail-section">
                  <h3 className="job-posting-rail-section-title">{t('jobPosting.aiReview')}</h3>
                  <p className="job-posting-rail-section-text">{analysis.review}</p>
                </section>
              )}
              {analysis.highlights.length > 0 && (
                <section className="job-posting-rail-section">
                  <h3 className="job-posting-rail-section-title">{t('jobPosting.highlights')}</h3>
                  <ul className="job-posting-rail-list">
                    {analysis.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
              {analysis.concerns.length > 0 && (
                <section className="job-posting-rail-section job-posting-rail-section-warn">
                  <h3 className="job-posting-rail-section-title">{t('jobPosting.concerns')}</h3>
                  <ul className="job-posting-rail-list">
                    {analysis.concerns.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <JobPostingApplyPanel
              saving={saving}
              dismissLoading={dismissLoading}
              alreadyDismissed={alreadyDismissed}
              trackerApplicationId={trackerApplicationId}
              onMarkApplied={() => addToTracker(false)}
              onDismiss={handleDismiss}
              onOpenTracker={(applicationId) => navigateToTracker({ applicationId })}
            />
          </aside>

          <section className="job-posting-workspace-frame card">
            <JobPostingFrame url={analysis.url} />
          </section>
        </div>
      )}

      <DuplicateApplicationModal
        open={duplicateModalOpen}
        match={duplicateMatch}
        mode="jobPosting"
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
