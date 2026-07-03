import { useCallback, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ApplicationTrackerMatch } from '../applications/trackerMatch'
import {
  formatTrackerMatchDate,
} from '../applications/trackerMatch'
import { sourceLabel, statusLabel } from '../i18n/labels'
import type { ApplicationSourceType, StatusType } from '../types'
import './TrackerAppliedWidget.css'

interface Props {
  match: ApplicationTrackerMatch
  sessionKey: string
  onOpenTracker: () => void
  side?: 'left' | 'right'
}

export function TrackerAppliedWidget({ match, sessionKey, onOpenTracker, side = 'left' }: Props) {
  const { t } = useTranslation()
  const popoverId = useId()
  const [dismissed, setDismissed] = useState(false)
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    setDismissed(false)
    setOpen(false)
  }, [sessionKey])

  const dismissForPageView = useCallback(() => {
    setDismissed(true)
    setOpen(false)
  }, [])

  if (dismissed) return null

  const dateLabel = formatTrackerMatchDate(match.last_applied_at)
  const visible = open || hover

  return (
    <div
      className={`tracker-applied-widget tracker-applied-widget-${side}${visible ? ' is-visible' : ''}${open ? ' is-open' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="tracker-applied-widget-trigger"
        aria-label={t('annuncio.trackerWidget.ariaLabel')}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="tracker-applied-widget-icon" aria-hidden="true" />
      </button>

      <div id={popoverId} className="tracker-applied-widget-popover" role="dialog" aria-live="polite">
        <div className="tracker-applied-widget-popover-head">
          <strong>{t('annuncio.trackerWidget.title')}</strong>
          <button
            type="button"
            className="tracker-applied-widget-close"
            aria-label={t('common.close')}
            onClick={dismissForPageView}
          >
            ×
          </button>
        </div>
        <p className="tracker-applied-widget-company">{match.company_name}</p>
        <p className="tracker-applied-widget-role">{match.job_title}</p>
        <dl className="tracker-applied-widget-meta">
          <div>
            <dt>{t('annuncio.trackerWidget.status')}</dt>
            <dd>{statusLabel(match.status as StatusType)}</dd>
          </div>
          <div>
            <dt>{t('annuncio.trackerWidget.source')}</dt>
            <dd>{sourceLabel(match.application_source as ApplicationSourceType)}</dd>
          </div>
          {dateLabel && (
            <div>
              <dt>{t('annuncio.trackerWidget.registeredAt')}</dt>
              <dd>{dateLabel}</dd>
            </div>
          )}
        </dl>
        <button type="button" className="tracker-applied-widget-action" onClick={onOpenTracker}>
          {t('common.openInTracker')}
        </button>
      </div>
    </div>
  )
}
