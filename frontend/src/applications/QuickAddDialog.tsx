'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Sparkles } from 'lucide-react'
import { useApplicationMutations } from '@/hooks/useApplicationMutations'
import { EMPTY_FORM, normalizeApplicationMethod } from '@/constants'
import type { ApplicationMethodType } from '@/types'
import type { JobUrlAnalysis } from '@/job-posting/types'
import type { ApplicationTrackerMatch } from './trackerMatch'
import type { PriorityType } from '@/types'
import { priorityLabel } from '@/i18n/labels'
import { billingApi } from '@/billing/api'
import { registerApplyTarget } from '@/apply/extensionBridge'
import { DuplicateApplicationModal } from '@/components/DuplicateApplicationModal'
import { navigateToTracker } from '@/pipeline/pipelineBridge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QuickAddAnalysisSummary } from './QuickAddAnalysisSummary'
import {
  analysisTrackerNotes,
  analyzeJobUrl,
  dismissAnalyzedJobUrl,
  isAnalysisDismissed,
  mapAnalysisRemoteType,
  publishAnalysisAppliedSync,
  trackAnalyzedJobUrl,
} from './jobUrlAnalysis'
import { mapUiStatusToDb } from './status'
import './quick-add-dialog.css'

type Step = 'url' | 'analyzing' | 'result' | 'manual'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function QuickAddDialog({ open, onOpenChange, onSaved }: QuickAddDialogProps) {
  const { t } = useTranslation()
  const { createApplication } = useApplicationMutations()
  const [step, setStep] = useState<Step>('url')
  const [jobUrl, setJobUrl] = useState('')
  const [analysis, setAnalysis] = useState<JobUrlAnalysis | null>(null)
  const [dismissedLocally, setDismissedLocally] = useState(false)
  const [canAnalyze, setCanAnalyze] = useState<boolean | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [status, setStatus] = useState<'saved' | 'applied'>('applied')
  const [priority, setPriority] = useState<PriorityType>('medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [duplicateMatch, setDuplicateMatch] = useState<ApplicationTrackerMatch | null>(null)
  const [pendingAppliedAction, setPendingAppliedAction] = useState(false)

  const reset = useCallback(() => {
    setStep('url')
    setJobUrl('')
    setAnalysis(null)
    setDismissedLocally(false)
    setCompanyName('')
    setJobTitle('')
    setManualUrl('')
    setStatus('applied')
    setPriority('medium')
    setError(null)
    setDuplicateModalOpen(false)
    setDuplicateMatch(null)
    setPendingAppliedAction(false)
  }, [])

  useEffect(() => {
    if (!open) return
    billingApi
      .status()
      .then((billing) => setCanAnalyze(billing?.features.live_jobs === true))
      .catch(() => setCanAnalyze(false))
  }, [open])

  const closeDialog = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset],
  )

  const finishSuccess = useCallback(() => {
    reset()
    onOpenChange(false)
    onSaved?.()
  }, [onOpenChange, onSaved, reset])

  const runAnalyze = async () => {
    const trimmed = jobUrl.trim()
    if (!trimmed) {
      setError(t('jobPosting.pasteUrlError'))
      return
    }
    setStep('analyzing')
    setError(null)
    setAnalysis(null)
    setDismissedLocally(false)
    try {
      const data = await analyzeJobUrl(trimmed)
      setAnalysis(data)
      registerApplyTarget(data.url, `${data.company} · ${data.role}`)
      setStep('result')
    } catch (e) {
      setStep('url')
      setError(e instanceof Error ? e.message : t('errors.analysisFailed'))
    }
  }

  const saveDraftFromAnalysis = async () => {
    if (!analysis) return
    if (!analysis.company.trim() || !analysis.role.trim()) {
      setError(t('errors.missingAnalysisFields'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { application_method, application_method_other } = normalizeApplicationMethod(
        analysis.application_method as ApplicationMethodType | null,
        null,
      )
      await createApplication({
        ...EMPTY_FORM,
        company_name: analysis.company.trim(),
        job_title: analysis.role.trim(),
        job_url: analysis.url.trim(),
        location: analysis.location.trim(),
        status: 'draft',
        priority: 'medium',
        remote_type: mapAnalysisRemoteType(analysis.remote_type),
        application_method,
        application_method_other,
        notes: analysisTrackerNotes(analysis, false),
        created_at: today,
      })
      finishSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.draftSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const markApplied = async (allowDuplicate = false) => {
    if (!analysis) return
    if (!analysis.company.trim() || !analysis.role.trim()) {
      setError(t('errors.missingAnalysisFields'))
      return
    }
    if (!allowDuplicate && analysis.tracker_match) {
      setDuplicateMatch(analysis.tracker_match)
      setPendingAppliedAction(true)
      setDuplicateModalOpen(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await trackAnalyzedJobUrl(analysis, { allowDuplicate })
      if (res.already_applied && res.tracker_match && !allowDuplicate) {
        publishAnalysisAppliedSync(analysis, null, res.application_id, res.live_offer_matches)
        setDuplicateMatch(res.tracker_match)
        setPendingAppliedAction(true)
        setDuplicateModalOpen(true)
        setAnalysis((current) => (current ? { ...current, tracker_match: res.tracker_match } : current))
        return
      }
      publishAnalysisAppliedSync(analysis, null, res.application_id, res.live_offer_matches)
      finishSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.trackFailed'))
    } finally {
      setBusy(false)
    }
  }

  const dismissAnalysis = async () => {
    if (!analysis || isAnalysisDismissed(analysis, dismissedLocally)) return
    setBusy(true)
    setError(null)
    try {
      await dismissAnalyzedJobUrl(analysis)
      setDismissedLocally(true)
      finishSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.dismissFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleManualSave = async () => {
    if (!companyName.trim() || !jobTitle.trim()) {
      setError(t('errors.requiredFields'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await createApplication({
        ...EMPTY_FORM,
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        job_url: manualUrl.trim(),
        status: mapUiStatusToDb(status),
        priority,
        created_at: today,
        last_applied_at: status === 'applied' ? new Date().toISOString() : '',
      })
      finishSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.genericSave'))
    } finally {
      setBusy(false)
    }
  }

  const openJobPage = () => {
    if (!analysis?.url) return
    window.open(analysis.url, '_blank', 'noopener,noreferrer')
    registerApplyTarget(analysis.url, `${analysis.company} · ${analysis.role}`)
  }

  const alreadyDismissed = analysis ? isAnalysisDismissed(analysis, dismissedLocally) : false

  return (
    <>
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="quick-add-dialog-content sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('candidature.quickAdd.title')}</DialogTitle>
          </DialogHeader>

          {step === 'url' && (
            <div className="space-y-4">
              <p className="quick-add-lead">{t('candidature.quickAdd.lead')}</p>
              {canAnalyze === false && (
                <p className="quick-add-upgrade">{t('candidature.quickAdd.upgradeHint')}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="quick-url">{t('candidature.quickAdd.jobLink')}</Label>
                <div className="quick-add-url-row">
                  <Input
                    id="quick-url"
                    type="url"
                    placeholder={t('candidature.quickAdd.urlPlaceholder')}
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canAnalyze) {
                        e.preventDefault()
                        void runAnalyze()
                      }
                    }}
                    autoFocus
                  />
                  <Button type="button" onClick={() => void runAnalyze()} disabled={!canAnalyze}>
                    <Sparkles aria-hidden="true" />
                    {t('common.analyze')}
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="link"
                className="quick-add-manual-link"
                onClick={() => {
                  setStep('manual')
                  setError(null)
                }}
              >
                {t('candidature.quickAdd.manualEntry')}
              </Button>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="quick-add-analyzing" aria-busy="true">
              <span className="spinner" />
              {t('candidature.quickAdd.analyzing')}
            </div>
          )}

          {step === 'result' && analysis && (
            <QuickAddAnalysisSummary analysis={analysis} duplicateHint />
          )}

          {step === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quick-company">{t('candidature.quickAdd.company')}</Label>
                <Input
                  id="quick-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-role">{t('candidature.quickAdd.role')}</Label>
                <Input id="quick-role" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-manual-url">{t('candidature.quickAdd.jobLink')}</Label>
                <Input
                  id="quick-manual-url"
                  type="url"
                  placeholder="https://..."
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('candidature.quickAdd.status')}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as 'saved' | 'applied')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saved">{t('candidature.quickAdd.draft')}</SelectItem>
                      <SelectItem value="applied">{t('candidature.quickAdd.applied')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('candidature.quickAdd.priority')}</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as PriorityType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{priorityLabel('low')}</SelectItem>
                      <SelectItem value="medium">{priorityLabel('medium')}</SelectItem>
                      <SelectItem value="high">{priorityLabel('high')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                variant="link"
                className="quick-add-manual-link"
                onClick={() => {
                  setStep('url')
                  setError(null)
                }}
              >
                {t('candidature.quickAdd.backToLink')}
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className={step === 'result' ? 'quick-add-actions quick-add-actions-split' : 'quick-add-actions'}>
            {step === 'url' && (
              <Button variant="outline" onClick={() => closeDialog(false)}>
                {t('common.close')}
              </Button>
            )}

            {step === 'result' && analysis && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => closeDialog(false)} disabled={busy}>
                    {t('common.close')}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void dismissAnalysis()}
                    disabled={busy || alreadyDismissed}
                  >
                    {alreadyDismissed ? t('candidature.quickAdd.dismissed') : t('common.dismiss')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void saveDraftFromAnalysis()} disabled={busy}>
                    {busy ? t('common.saving') : t('candidature.quickAdd.draft')}
                  </Button>
                  <Button variant="outline" onClick={openJobPage} disabled={busy}>
                    <ExternalLink aria-hidden="true" />
                    {t('common.openJobPosting')}
                  </Button>
                  <Button onClick={() => void markApplied(false)} disabled={busy}>
                    {busy ? t('common.saving') : t('candidature.quickAdd.markApplied')}
                  </Button>
                </div>
              </>
            )}

            {step === 'manual' && (
              <>
                <Button variant="outline" onClick={() => closeDialog(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => void handleManualSave()} disabled={busy}>
                  {busy ? t('common.saving') : t('common.save')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateApplicationModal
        open={duplicateModalOpen}
        match={duplicateMatch}
        mode="jobPosting"
        saving={busy}
        onClose={() => {
          setDuplicateModalOpen(false)
          setPendingAppliedAction(false)
        }}
        onOpenTracker={(applicationId) => {
          setDuplicateModalOpen(false)
          closeDialog(false)
          navigateToTracker({ applicationId })
        }}
        onCreateDuplicate={
          pendingAppliedAction
            ? () => {
                setDuplicateModalOpen(false)
                void markApplied(true)
              }
            : undefined
        }
      />
    </>
  )
}
