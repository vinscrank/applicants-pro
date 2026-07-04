import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { profileToAutofillPayload } from '../auth/types'

interface Props {
  saving: boolean
  dismissLoading: boolean
  alreadyDismissed: boolean
  trackerApplicationId: number | null
  onMarkApplied: () => void
  onDismiss: () => void
  onOpenTracker: (applicationId: number) => void
}

export function JobPostingApplyPanel({
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
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const quickFields = useMemo(() => {
    if (!profile) return []
    const p = profileToAutofillPayload(profile)
    return [
      { label: t('auth.email'), value: p.email },
      { label: t('profile.phone'), value: p.phone },
      { label: 'LinkedIn', value: p.linkedin_url },
    ].filter((field) => field.value)
  }, [profile, t])

  const copy = async (value: string, fieldLabel: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setStatus({ kind: 'ok', text: t('jobPosting.fieldCopied', { field: fieldLabel }) })
    } catch {
      setStatus({ kind: 'err', text: t('jobPosting.copyFailed') })
    }
  }

  return (
    <div className="job-posting-side-actions">
      <button
        type="button"
        className="btn btn-primary job-posting-apply-btn"
        disabled={saving || dismissLoading}
        onClick={onMarkApplied}
      >
        {saving ? t('common.saving') : t('jobPosting.iApplied')}
      </button>

      <div className="job-posting-apply-footer">
        {trackerApplicationId != null && (
          <button
            type="button"
            className="job-posting-apply-link"
            onClick={() => onOpenTracker(trackerApplicationId)}
          >
            {t('common.openInTracker')}
          </button>
        )}
        <button
          type="button"
          className="job-posting-apply-link job-posting-apply-link-muted"
          disabled={alreadyDismissed || dismissLoading || saving}
          onClick={onDismiss}
        >
          {alreadyDismissed ? t('jobPosting.dismissed') : dismissLoading ? t('jobPosting.dismissing') : t('jobPosting.dismissJob')}
        </button>
      </div>

      {quickFields.length > 0 && (
        <div className="job-posting-copy-chips">
          {quickFields.map((field) => (
            <button
              key={field.label}
              type="button"
              className="job-posting-copy-chip"
              onClick={() => copy(field.value, field.label)}
            >
              {field.label}
            </button>
          ))}
        </div>
      )}

      {status && <p className={`job-posting-apply-status job-posting-apply-status-${status.kind}`}>{status.text}</p>}
    </div>
  )
}
