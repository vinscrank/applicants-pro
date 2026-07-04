import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchSummary } from '../types'
import { SearchHistory } from './SearchHistory'
import './JobsHistorySheet.css'

interface Props {
  open: boolean
  onClose: () => void
  history: SearchSummary[]
  currentSearchId?: number
  loading?: boolean
  onSelect: (id: number) => void
}

export function JobsHistorySheet({
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
    <div className="jobs-history-backdrop" onClick={onClose} role="presentation">
      <aside
        className="jobs-history-sheet"
        onClick={(e) => e.stopPropagation()}
        aria-label={t('jobs.historySheet.ariaLabel')}
      >
        <header className="jobs-history-header">
          <div>
            <h2>{t('jobs.historySheet.title')}</h2>
            <p className="jobs-history-subtitle">{t('jobs.historySheet.subtitle')}</p>
          </div>
          <button type="button" className="jobs-history-close" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>

        <div className="jobs-history-body">
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
