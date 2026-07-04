import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchPreferences } from '../types'
import type { LlmControlsUpdate, LlmStats } from '../types/llm'
import { AiCreditsPanel } from './AiCreditsPanel'
import { SearchPreferencesPanel } from './SearchPreferencesPanel'
import './JobsSettingsSheet.css'

type Tab = 'search' | 'ai'

interface Props {
  open: boolean
  onClose: () => void
  stats: LlmStats | null
  searchPreferences: SearchPreferences
  onSearchPreferencesChange: (prefs: SearchPreferences) => void
  onSearchPreferencesSaved?: (prefs: SearchPreferences) => void
  onRefreshStats: () => void
  onBudgetChange: (budget: number) => Promise<void>
  onControlsChange: (controls: LlmControlsUpdate) => Promise<void>
  onSuccess: (msg: string) => void
}

export function JobsSettingsSheet({
  open,
  onClose,
  stats,
  searchPreferences,
  onSearchPreferencesChange,
  onSearchPreferencesSaved,
  onRefreshStats,
  onBudgetChange,
  onControlsChange,
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('search')
  const [draftPrefs, setDraftPrefs] = useState(searchPreferences)

  useEffect(() => {
    if (open) setDraftPrefs(searchPreferences)
  }, [open, searchPreferences])

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
    <div className="jobs-sheet-backdrop" onClick={onClose} role="presentation">
      <aside
        className="jobs-sheet"
        onClick={(e) => e.stopPropagation()}
        aria-label={t('jobs.settingsSheet.ariaLabel')}
      >
        <header className="jobs-sheet-header">
          <h2>{t('jobs.settingsSheet.title')}</h2>
          <button type="button" className="jobs-sheet-close" onClick={onClose}>
            {t('common.close')}
          </button>
        </header>

        <div className="jobs-sheet-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={tab === 'search' ? 'active' : ''}
            onClick={() => setTab('search')}
          >
            {t('jobs.settingsSheet.tabSearch')}
          </button>
          <button
            type="button"
            role="tab"
            className={tab === 'ai' ? 'active' : ''}
            onClick={() => setTab('ai')}
          >
            {t('jobs.settingsSheet.tabAi')}
          </button>
        </div>

        <div className="jobs-sheet-body">
          {tab === 'search' && (
            <SearchPreferencesPanel
              preferences={draftPrefs}
              onChange={(prefs) => {
                setDraftPrefs(prefs)
                onSearchPreferencesChange(prefs)
              }}
              onSaved={(prefs) => {
                onSuccess(t('jobs.settingsSheet.filtersSaved'))
                onSearchPreferencesSaved?.(prefs)
              }}
              embedded
            />
          )}
          {tab === 'ai' && (
            <AiCreditsPanel
              stats={stats}
              onRefresh={onRefreshStats}
              onBudgetChange={onBudgetChange}
              onControlsChange={onControlsChange}
              embedded
            />
          )}
        </div>
      </aside>
    </div>
  )
}
