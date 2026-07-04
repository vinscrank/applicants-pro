import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchPreferences, SortBy } from '../types'
import { DEFAULT_SEARCH_PREFERENCES } from '../types'
import { jobsFetch } from '../api'
import { SORT_OPTIONS } from '../searchFilterOptions'
import './SearchPreferencesPanel.css'

interface Props {
  preferences: SearchPreferences
  onChange: (prefs: SearchPreferences) => void
  onSaved?: (prefs: SearchPreferences) => void
  embedded?: boolean
}

export function SearchPreferencesPanel({ preferences, onChange, onSaved, embedded }: Props) {
  const { t } = useTranslation()
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
      const data = await jobsFetch<SearchPreferences>('/api/jobs/preferences', {
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
      {!embedded && <h2>{t('jobs.searchPref.title')}</h2>}
      <p className="search-pref-intro">{t('jobs.searchPref.intro')}</p>

      <div className="search-pref-field">
        <label className="search-pref-label" htmlFor="sort-by">{t('jobs.searchPref.sortLabel')}</label>
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
        <span>{t('jobs.searchPref.requireActiveApply')}</span>
      </label>

      <div className="search-pref-actions">
        <button type="button" className="search-pref-save" onClick={save} disabled={saving}>
          {saving ? t('jobs.searchPref.saving') : t('jobs.searchPref.save')}
        </button>
        <button type="button" className="search-pref-reset" onClick={reset}>
          {t('jobs.searchPref.reset')}
        </button>
      </div>

      {saved && <p className="search-pref-saved">{t('jobs.searchPref.saved')}</p>}
    </section>
  )
}
