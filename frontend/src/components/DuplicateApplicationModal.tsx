import type { ApplicationTrackerMatch } from '../applications/trackerMatch'
import { useTranslation } from 'react-i18next'
import {
  formatTrackerMatchDate,
  trackerMatchSourceLabel,
  trackerMatchStatusLabel,
} from '../applications/trackerMatch'

interface Props {
  open: boolean
  match: ApplicationTrackerMatch | null
  mode: 'jobPosting' | 'live'
  saving?: boolean
  onClose: () => void
  onOpenTracker: (applicationId: number) => void
  onCreateDuplicate?: () => void
}

export function DuplicateApplicationModal({
  open,
  match,
  mode,
  saving = false,
  onClose,
  onOpenTracker,
  onCreateDuplicate,
}: Props) {
  const { t } = useTranslation()

  if (!open || !match) return null

  const appliedDate = formatTrackerMatchDate(match.last_applied_at)

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal card duplicate-application-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-application-title"
      >
        <div className="modal-header">
          <h2 id="duplicate-application-title">{t('candidature.duplicate.title')}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('common.close')}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p className="duplicate-application-lead">
            {mode === 'live' ? t('candidature.duplicate.liveLead') : t('candidature.duplicate.jobPostingLead')}
          </p>
          <div className="duplicate-application-card">
            <strong>{match.company_name}</strong>
            <span>{match.job_title}</span>
            <span className="duplicate-application-meta">
              {trackerMatchStatusLabel(match.status)}
              {' · '}
              {trackerMatchSourceLabel(match.application_source)}
              {appliedDate ? ` · ${appliedDate}` : ''}
            </span>
          </div>
          {mode === 'jobPosting' && (
            <p className="duplicate-application-note">{t('candidature.duplicate.note')}</p>
          )}
        </div>
        <div className="modal-footer duplicate-application-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
          {mode === 'jobPosting' && onCreateDuplicate && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCreateDuplicate}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('candidature.duplicate.createAnyway')}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenTracker(match.application_id)}
            disabled={saving}
          >
            {t('common.openInTracker')}
          </button>
        </div>
      </div>
    </div>
  )
}
