import { useTranslation } from 'react-i18next'
import type { SearchPreferences, SortBy } from '../types'
import type { OfferStatusFilter } from './StatsBar'
import { SORT_OPTIONS } from '../searchFilterOptions'
import './OffersListToolbar.css'

interface Props {
  filters: SearchPreferences
  onFiltersChange: (filters: SearchPreferences) => void
  listSearchQuery: string
  onListSearchChange: (query: string) => void
  visibleCount: number
  candidabiliCount: number
  appliedCount: number
  maybeCount: number
  dismissedCount: number
  activeView: 'valid' | 'dismissed'
  statusFilter: OfferStatusFilter
  onSelectCandidabili: () => void
  onSelectApplied: () => void
  onSelectMaybe: () => void
  onSelectDismissed: () => void
}

export function OffersListToolbar({
  filters,
  onFiltersChange,
  listSearchQuery,
  onListSearchChange,
  visibleCount,
  candidabiliCount,
  appliedCount,
  maybeCount,
  dismissedCount,
  activeView,
  statusFilter,
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
    <div className="offers-list-toolbar">
      <div className="offers-list-toolbar-main">
        <div className="offers-list-toolbar-filters" role="tablist" aria-label={t('offerte.filterOffersAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={candidabiliActive}
            className={`offers-list-tab offers-list-tab-candidabili${candidabiliActive ? ' active' : ''}`}
            onClick={onSelectCandidabili}
          >
            {t('offerte.tabs.candidabili')}
            <span className="offers-list-tab-count">{candidabiliCount}</span>
          </button>
          {appliedCount > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={appliedActive}
              className={`offers-list-tab offers-list-tab-applied${appliedActive ? ' active' : ''}`}
              onClick={onSelectApplied}
            >
              {t('offerte.tabs.applied')}
              <span className="offers-list-tab-count">{appliedCount}</span>
            </button>
          )}
          {maybeCount > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={maybeActive}
              className={`offers-list-tab offers-list-tab-maybe${maybeActive ? ' active' : ''}`}
              onClick={onSelectMaybe}
            >
              {t('offerte.tabs.maybe')}
              <span className="offers-list-tab-count">{maybeCount}</span>
            </button>
          )}
          {dismissedCount > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={dismissedActive}
              className={`offers-list-tab offers-list-tab-dismissed${dismissedActive ? ' active' : ''}`}
              onClick={onSelectDismissed}
            >
              {t('offerte.tabs.dismissed')}
              <span className="offers-list-tab-count">{dismissedCount}</span>
            </button>
          )}
        </div>

        <div className="offers-list-toolbar-controls">
          <label className="offers-list-toolbar-sort">
            <span className="sr-only">{t('offerte.sortOrder')}</span>
            <select
              value={filters.sort_by}
              onChange={(e) => onFiltersChange({ ...filters, sort_by: e.target.value as SortBy })}
              aria-label={t('offerte.sortOrderResults')}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{t(`offerte.sort.${o.value}`)}</option>
              ))}
            </select>
          </label>
          <input
            type="search"
            className="offers-list-toolbar-search"
            value={listSearchQuery}
            onChange={(e) => onListSearchChange(e.target.value)}
            placeholder={t('offerte.filterTablePlaceholder')}
            aria-label={t('offerte.filterTableAria')}
          />
        </div>
      </div>
      <p className="offers-list-toolbar-meta">
        {t('offerte.visibleRows', { count: visibleCount })}
      </p>
    </div>
  )
}
