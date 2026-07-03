import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { profileToAutofillPayload } from '../auth/types'
import {
  isExtensionAvailable,
  registerApplyTarget,
  requestAutofill,
} from '../apply/extensionBridge'
import type { JobUrlAnalysis } from './types'

interface Props {
  analysis: JobUrlAnalysis
  saving: boolean
  dismissLoading: boolean
  alreadyDismissed: boolean
  trackerApplicationId: number | null
  onMarkApplied: () => void
  onDismiss: () => void
  onOpenTracker: (applicationId: number) => void
}

export function AnnuncioApplyPanel({
  analysis,
  saving,
  dismissLoading,
  alreadyDismissed,
  trackerApplicationId,
  onMarkApplied,
  onDismiss,
  onOpenTracker,
}: Props) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [autofillLoading, setAutofillLoading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null)
  const extensionReady = isExtensionAvailable()
  const label = `${analysis.company} · ${analysis.role}`

  const quickFields = useMemo(() => {
    if (!profile) return []
    const p = profileToAutofillPayload(profile)
    return [
      { label: t('auth.email'), value: p.email },
      { label: t('profile.phone'), value: p.phone },
      { label: 'LinkedIn', value: p.linkedin_url },
    ].filter((field) => field.value)
  }, [profile, t])

  const openFormTab = () => {
    window.open(analysis.url, '_blank', 'noopener,noreferrer')
    registerApplyTarget(analysis.url, label)
    setStatus({
      kind: 'info',
      text: extensionReady
        ? t('annuncio.formOpenedExtension')
        : t('annuncio.formOpenedNoExtension'),
    })
  }

  const autofill = async () => {
    if (!profile) return
    registerApplyTarget(analysis.url, label)
    setAutofillLoading(true)
    setStatus({ kind: 'info', text: t('annuncio.fillingAi') })
    const payload = profileToAutofillPayload(profile)
    const autofillPayload = Object.fromEntries(
      Object.entries(payload).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
    const result = await requestAutofill(autofillPayload)
    setAutofillLoading(false)
    setStatus({ kind: result.ok ? 'ok' : 'err', text: result.message })
  }

  const copy = async (value: string, fieldLabel: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatus({ kind: 'ok', text: t('annuncio.fieldCopied', { field: fieldLabel }) })
    } catch {
      setStatus({ kind: 'err', text: t('annuncio.copyFailed') })
    }
  }

  return (
    <section className="annuncio-apply-panel card">
      <h3 className="annuncio-apply-title">{t('annuncio.applyTitle')}</h3>
      <p className="annuncio-apply-lead">{t('annuncio.applyLead')}</p>

      <div className="annuncio-apply-actions">
        <button type="button" className="btn btn-secondary annuncio-apply-btn" onClick={openFormTab}>
          {t('annuncio.openForm')}
        </button>
        {extensionReady && (
          <button
            type="button"
            className="btn btn-primary annuncio-apply-btn"
            onClick={autofill}
            disabled={autofillLoading}
          >
            {autofillLoading ? t('annuncio.fillingAi') : t('annuncio.fillWithAi')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary annuncio-apply-btn annuncio-apply-btn-success"
          disabled={saving || dismissLoading}
          onClick={onMarkApplied}
        >
          {saving ? t('common.saving') : t('annuncio.iApplied')}
        </button>
        {trackerApplicationId != null && (
          <button
            type="button"
            className="pipeline-link-btn pipeline-link-btn-secondary annuncio-apply-btn"
            onClick={() => onOpenTracker(trackerApplicationId)}
          >
            {t('common.openInTracker')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger annuncio-apply-btn"
          disabled={alreadyDismissed || dismissLoading || saving}
          onClick={onDismiss}
        >
          {alreadyDismissed ? t('annuncio.dismissed') : dismissLoading ? t('annuncio.dismissing') : t('annuncio.dismissJob')}
        </button>
      </div>

      {!extensionReady && (
        <p className="annuncio-apply-hint">{t('annuncio.extensionHint')}</p>
      )}

      {quickFields.length > 0 && (
        <div className="annuncio-apply-fields">
          {quickFields.map((field) => (
            <div key={field.label} className="annuncio-apply-field">
              <span className="annuncio-apply-field-label">{field.label}</span>
              <button
                type="button"
                className="annuncio-apply-copy"
                onClick={() => copy(field.value, field.label)}
              >
                {t('annuncio.copy')}
              </button>
            </div>
          ))}
        </div>
      )}

      {status && <p className={`annuncio-apply-status annuncio-apply-status-${status.kind}`}>{status.text}</p>}
    </section>
  )
}
