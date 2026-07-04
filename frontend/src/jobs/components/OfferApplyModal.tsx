import { useTranslation } from 'react-i18next'
import type { JobOffer } from '../types'
import { OfferOriginIcon } from './OfferOriginIcon'
import { ProfileFitFeedback } from './ProfileFitFeedback'
import './OfferApplyModal.css'

interface Props {
  open: boolean
  offer: JobOffer | null
  applyUrl: string
  loading?: boolean
  onClose: () => void
  onMarkApplied: () => void
  onDismiss: () => void
  onReopenApply: () => void
}

export function OfferApplyModal({
  open,
  offer,
  applyUrl,
  loading = false,
  onClose,
  onMarkApplied,
  onDismiss,
  onReopenApply,
}: Props) {
  const { t } = useTranslation()

  if (!open || !offer) return null

  return (
    <div
      className="offer-apply-modal"
      role="dialog"
      aria-modal="false"
      aria-labelledby="offer-apply-modal-title"
    >
      <div className="offer-apply-modal-card card">
        <div className="offer-apply-modal-header">
          <div>
            <h2 id="offer-apply-modal-title">{t('offerApplyModal.title')}</h2>
            <p className="offer-apply-modal-subtitle">{t('offerApplyModal.subtitle')}</p>
          </div>
          <button
            type="button"
            className="offer-apply-modal-close"
            onClick={onClose}
            aria-label={t('common.close')}
            disabled={loading}
          >
            &times;
          </button>
        </div>

        <div className="offer-apply-modal-offer">
          <div className="offer-apply-modal-company">
            <OfferOriginIcon offer={offer} />
            <span>{offer.company}</span>
          </div>
          <div className="offer-apply-modal-role">{offer.role}</div>
          {offer.location && <div className="offer-apply-modal-meta">{offer.location}</div>}
          <ProfileFitFeedback offer={offer} />
        </div>

        <div className="offer-apply-modal-actions">
          {applyUrl && (
            <button type="button" className="btn btn-secondary" onClick={onReopenApply} disabled={loading}>
              {t('offerApplyModal.reopen')}
            </button>
          )}
          <div className="offer-apply-modal-actions-row">
            <button type="button" className="btn btn-primary" onClick={onMarkApplied} disabled={loading}>
              {loading ? t('common.saving') : t('jobs.actions.applyAndTrack')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onDismiss} disabled={loading}>
              {t('candidature.quickAdd.dismiss')}
            </button>
          </div>
        </div>

        <p className="offer-apply-modal-hint">{t('offerApplyModal.hint')}</p>
      </div>
    </div>
  )
}
