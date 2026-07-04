import type { OfferStatusFilter } from './StatsBar'
import type { PromptInterpretationItem } from '../promptTerms'
import { useTranslation } from 'react-i18next'
import { PromptInterpretationChips } from './PromptInterpretationChips'
import './OffersResultsBar.css'

interface Props {
  totalCount: number
  candidabiliCount: number
  appliedCount: number
  maybeCount: number
  dismissedCount: number
  dismissedAppliedCount: number
  dismissedPendingCount: number
  activeView: 'valid' | 'dismissed'
  statusFilter: OfferStatusFilter
  interpretationItems?: PromptInterpretationItem[]
  onSelectCandidabili: () => void
  onSelectApplied: () => void
  onSelectMaybe: () => void
  onSelectDismissed: () => void
}

export function OffersResultsBar({
  totalCount,
  candidabiliCount,
  appliedCount,
  maybeCount,
  dismissedCount,
  dismissedAppliedCount,
  dismissedPendingCount,
  activeView,
  statusFilter,
  interpretationItems = [],
  onSelectCandidabili,
  onSelectApplied,
  onSelectMaybe,
  onSelectDismissed,
}: Props) {
  const { t } = useTranslation()
  const candidabiliActive = activeView === 'valid' && (statusFilter === 'all' || statusFilter === 'verified')
  const appliedActive = activeView === 'valid' && statusFilter === 'applied'
  const maybeActive = activeView === 'valid' && statusFilter === 'maybe'
  const dismissedActive = activeView === 'dismissed'

  return (
    <div className="offers-results-bar card">
      <div className="offers-results-head">
        <span className="offers-results-title">{totalCount} pertinenti al prompt</span>
        {interpretationItems.length > 0 && (
          <PromptInterpretationChips items={interpretationItems} compact />
        )}
      </div>
      <div className="offers-results-actions" role="tablist" aria-label={t('jobs.filterOffersAria')}>
        <button
          type="button"
          role="tab"
          aria-selected={candidabiliActive}
          className={`offers-results-pill offers-results-candidabili${candidabiliActive ? ' active' : ''}`}
          onClick={onSelectCandidabili}
        >
          <span className="offers-results-count">{candidabiliCount}</span>
          <span className="offers-results-label">Candidabili</span>
        </button>
        {appliedCount > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={appliedActive}
            className={`offers-results-pill offers-results-applied${appliedActive ? ' active' : ''}`}
            onClick={onSelectApplied}
            title={t('jobs.resultsBar.appliedTitle')}
          >
            <span className="offers-results-count">{appliedCount}</span>
            <span className="offers-results-label">Già candidato</span>
          </button>
        )}
        {maybeCount > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={maybeActive}
            className={`offers-results-pill offers-results-maybe${maybeActive ? ' active' : ''}`}
            onClick={onSelectMaybe}
          >
            <span className="offers-results-count">{maybeCount}</span>
            <span className="offers-results-label">Da controllare</span>
          </button>
        )}
        {dismissedCount > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={dismissedActive}
            className={`offers-results-pill offers-results-dismissed${dismissedActive ? ' active' : ''}`}
            onClick={onSelectDismissed}
            title={
              dismissedCount > 0
                ? `${dismissedAppliedCount} già candidato · ${dismissedPendingCount} non candidato`
                : undefined
            }
          >
            <span className="offers-results-count">{dismissedCount}</span>
            <span className="offers-results-label">Scartate da te</span>
          </button>
        )}
      </div>
    </div>
  )
}
