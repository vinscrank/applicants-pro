import { useState } from 'react'
import type { SearchPreferences, SortBy } from '../types'
import { DEFAULT_SEARCH_PREFERENCES } from '../types'
import { offerteFetch } from '../api'
import { SORT_OPTIONS } from '../searchFilterOptions'
import './SearchPreferencesPanel.css'

interface Props {
  preferences: SearchPreferences
  onChange: (prefs: SearchPreferences) => void
  onSaved?: (prefs: SearchPreferences) => void
  embedded?: boolean
}

export function SearchPreferencesPanel({ preferences, onChange, onSaved, embedded }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (patch: Partial<SearchPreferences>) => {
    setSaved(false)
    onChange({ ...preferences, ...patch })
  }

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const data = await offerteFetch<SearchPreferences>('/api/offerte/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences),
      })
      onChange(data)
      setSaved(true)
      onSaved?.(data)
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setSaved(false)
    onChange({ ...DEFAULT_SEARCH_PREFERENCES })
  }

  return (
    <section className={`search-pref-panel ${embedded ? 'search-pref-embedded' : ''}`}>
      {!embedded && <h2>Preferenze ricerca</h2>}
      <p className="search-pref-intro">
        Ruolo, location, data di pubblicazione e altri vincoli vanno scritti nel prompt.
        Le offerte arrivano da LinkedIn e dai career site aziendali (Greenhouse, Lever, Workable, Ashby).
      </p>

      <div className="search-pref-field">
        <label className="search-pref-label" htmlFor="sort-by">Ordinamento predefinito</label>
        <select
          id="sort-by"
          className="search-pref-select"
          value={preferences.sort_by}
          onChange={(e) => update({ sort_by: e.target.value as SortBy })}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <label className="search-pref-check">
        <input
          type="checkbox"
          checked={preferences.require_active_apply}
          onChange={(e) => update({ require_active_apply: e.target.checked })}
        />
        <span>Verifica apply attivo (solo nota informativa, non nasconde offerte)</span>
      </label>

      <div className="search-pref-actions">
        <button type="button" className="search-pref-save" onClick={save} disabled={saving}>
          {saving ? 'Salvo...' : 'Salva preferenze'}
        </button>
        <button type="button" className="search-pref-reset" onClick={reset}>
          Ripristina default
        </button>
      </div>

      {saved && <p className="search-pref-saved">Preferenze salvate.</p>}
    </section>
  )
}
