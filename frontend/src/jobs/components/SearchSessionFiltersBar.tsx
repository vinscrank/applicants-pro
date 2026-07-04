import { useState } from 'react'
import type { SearchPreferences, SortBy } from '../types'
import { SORT_OPTIONS } from '../searchFilterOptions'
import './SearchSessionFiltersBar.css'

interface Props {
  filters: SearchPreferences
  onChange: (filters: SearchPreferences) => void
  poolCount?: number
  visibleCount?: number
  totalCount?: number
}

export function SearchSessionFiltersBar({
  filters,
  onChange,
  poolCount,
  visibleCount,
  totalCount,
}: Props) {
  const [open, setOpen] = useState(true)

  const update = (patch: Partial<SearchPreferences>) => {
    onChange({ ...filters, ...patch })
  }

  return (
    <div className="session-filters card">
      <div className="session-filters-head">
        <button type="button" className="session-filters-toggle" onClick={() => setOpen(!open)}>
          Ordinamento risultati
          <span className="session-filters-chevron">{open ? '▾' : '▸'}</span>
        </button>
        <div className="session-filters-summary">
          <span className="session-filters-pill">
            {SORT_OPTIONS.find((o) => o.value === filters.sort_by)?.label || filters.sort_by}
          </span>
        </div>
      </div>

      {open && (
        <div className="session-filters-body">
          <p className="session-filters-note">
            {totalCount != null && totalCount > 0
              ? `${totalCount} pertinenti al prompt${visibleCount != null && visibleCount !== totalCount ? ` · ${visibleCount} candidabili` : ''}. Solo annunci coerenti con ruolo, location e periodo indicati nel prompt.`
              : poolCount != null && visibleCount != null
              ? `${visibleCount} candidabili su ${poolCount} raccolte. Ruolo, location e data nel prompt di ricerca.`
              : `Ruolo, location, data e origine si impostano nel prompt. Qui scegli solo l'ordinamento della lista.`}
          </p>

          <div className="session-filters-row session-filters-row-compact">
            <div className="session-filters-field">
              <label htmlFor="session-sort">Ordine</label>
              <select
                id="session-sort"
                value={filters.sort_by}
                onChange={(e) => update({ sort_by: e.target.value as SortBy })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
