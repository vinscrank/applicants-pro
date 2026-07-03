import { useTranslation } from 'react-i18next'
import type { SearchSummary } from '../types'
import {
  groupHistoryByCategory,
  formatHistoryDateShort,
  historyCategoryLabel,
} from '../historyUtils'
import './SearchHistory.css'

interface Props {
  history: SearchSummary[]
  currentId?: number
  onSelect: (id: number) => void
  loading?: boolean
}

function categoryFilters(entry: SearchSummary): string | null {
  if (entry.prompt_text.trim()) return null
  const parts: string[] = []
  if (entry.locations.length) parts.push(entry.locations.join(', '))
  if (entry.allowed_roles.length) parts.push(entry.allowed_roles.join(', '))
  return parts.length ? parts.join(' · ') : null
}

export function SearchHistory({ history, currentId, onSelect, loading }: Props) {
  const { t } = useTranslation()

  const visitMeta = (entry: SearchSummary): string => {
    const parts = [
      t('offerte.historySheet.metaOffers', { count: entry.total_found }),
      t('offerte.historySheet.metaVerified', { count: entry.verified_count }),
    ]
    if (entry.maybe_count > 0) {
      parts.push(t('offerte.historySheet.metaMaybe', { count: entry.maybe_count }))
    }
    return parts.join(' · ')
  }

  if (history.length === 0) {
    return <p className="history-empty">{t('offerte.historySheet.empty')}</p>
  }

  const categories = groupHistoryByCategory(history)

  return (
    <div className="search-history">
      {categories.map((category) => (
        <section key={category.key} className="history-category">
          <header className="history-category-header">
            <h3 className="history-category-title">{category.label}</h3>
            <span className="history-category-count">
              {t('offerte.historySheet.visit', { count: category.visits.length })}
            </span>
          </header>

          {categoryFilters(category.visits[0]) && (
            <p className="history-category-filters">{categoryFilters(category.visits[0])}</p>
          )}

          <ul className="history-visits">
            {category.visits.map((visit) => {
              const active = currentId === visit.id
              return (
                <li key={visit.id}>
                  <button
                    type="button"
                    className={`history-visit-btn${active ? ' active' : ''}`}
                    onClick={() => onSelect(visit.id)}
                    disabled={loading}
                  >
                    <span className="history-visit-date">
                      {formatHistoryDateShort(visit.searched_at)}
                    </span>
                    <span className="history-visit-meta">{visitMeta(visit)}</span>
                    {visit.prompt_text.trim() && visit.prompt_text !== category.label && (
                      <span className="history-visit-prompt">{historyCategoryLabel(visit)}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
