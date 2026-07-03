import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchSummary } from '../types'
import { SearchHistory } from './SearchHistory'
import './OfferteHistorySheet.css'

interface Props {
  open: boolean
  onClose: () => void
  history: SearchSummary[]
  currentSearchId?: number
  loading?: boolean
  onSelect: (id: number) => void
}

export function OfferteHistorySheet({
  open,
  onClose,
  history,
  currentSearchId,
  loading,
  onSelect,
}: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="offerte-history-backdrop" onClick={onClose} role="presentation">
      <aside
        className="offerte-history-sheet"
        onClick={(e) => e.stopPropagation()}
        aria-label={t('offerte.historySheet.ariaLabel')}
      >
        <header className="offerte-history-header">
          <div>
            <h2>{t('offerte.historySheet.title')}</h2>
            <p className="offerte-history-subtitle">{t('offerte.historySheet.subtitle')}</p>
          </div>
          <button type="button" className="offerte-history-close" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>

        <div className="offerte-history-body">
          <SearchHistory
            history={history}
            currentId={currentSearchId}
            onSelect={onSelect}
            loading={loading}
          />
        </div>
      </aside>
    </div>
  )
}
