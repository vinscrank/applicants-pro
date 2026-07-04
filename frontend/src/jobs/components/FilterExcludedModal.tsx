import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { JobOffer } from '../types'
import { matchesOfferListSearch } from '../offerListSearch'
import { OffersTable } from './OffersTable'
import './FilterExcludedModal.css'

interface Props {
  open: boolean
  onClose: () => void
  offers: JobOffer[]
  onApply: (offer: JobOffer) => void
  onMarkApplied: (offer: JobOffer) => void
  onReopenApply: (offer: JobOffer) => void
  onDismiss: (offer: JobOffer) => void
  onRestore: (offer: JobOffer) => void
  onViewInTracker?: (applicationId: number) => void
}

export function FilterExcludedModal({
  open,
  onClose,
  offers,
  onApply,
  onMarkApplied,
  onReopenApply,
  onDismiss,
  onRestore,
  onViewInTracker,
}: Props) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setSearchQuery('')
  }, [open])

  const filteredOffers = useMemo(() => {
    const q = searchQuery.trim()
    if (!q) return offers
    return offers.filter((o) => matchesOfferListSearch(o, q))
  }, [offers, searchQuery])

  if (!open) return null

  return (
    <div className="filter-excluded-backdrop" onClick={onClose} role="presentation">
      <div
        className="filter-excluded-modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-excluded-title"
      >
        <header className="filter-excluded-header">
          <div>
            <h2 id="filter-excluded-title">{t('jobs.filterExcluded.title')}</h2>
            <p className="filter-excluded-subtitle">
              {t('jobs.filterExcluded.subtitle', { count: offers.length })}
            </p>
          </div>
          <button type="button" className="filter-excluded-close" onClick={onClose}>
            {t('jobs.filterExcluded.close')}
          </button>
        </header>

        <div className="filter-excluded-toolbar">
          <label className="filter-excluded-search">
            <span className="filter-excluded-search-label">{t('jobs.filterExcluded.searchLabel')}</span>
            <input
              type="search"
              className="filter-excluded-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('jobs.filterExcluded.searchPlaceholder')}
              aria-label={t('jobs.filterExcluded.searchAria')}
            />
          </label>
          <span className="filter-excluded-count">
            {filteredOffers.length}/{offers.length}
          </span>
        </div>

        <div className="filter-excluded-body">
          {filteredOffers.length === 0 ? (
            <div className="filter-excluded-empty">
              {searchQuery.trim()
                ? t('jobs.filterExcluded.emptySearch')
                : t('jobs.filterExcluded.emptyDefault')}
            </div>
          ) : (
            <OffersTable
              offers={filteredOffers}
              paginationResetKey={searchQuery}
              onApply={onApply}
              onMarkApplied={onMarkApplied}
              onReopenApply={onReopenApply}
              onDismiss={onDismiss}
              onRestore={onRestore}
              onViewInTracker={onViewInTracker}
            />
          )}
        </div>
      </div>
    </div>
  )
}
