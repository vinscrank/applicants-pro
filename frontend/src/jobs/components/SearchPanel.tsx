import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SearchCommand } from '../types'
import type { PromptInterpretationItem } from '../promptTerms'
import { PromptInterpretationChips } from './PromptInterpretationChips'
import './SearchPanel.css'

interface Props {
  command: SearchCommand
  onChange: (command: SearchCommand) => void
  onSearch: () => void
  loading: boolean
  parsing: boolean
  interpretationItems?: PromptInterpretationItem[]
}

export function SearchPanel({
  command,
  onChange,
  onSearch,
  loading,
  parsing,
  interpretationItems = [],
}: Props) {
  const { t } = useTranslation()
  const busy = loading || parsing
  const showInterpretation = parsing || interpretationItems.length > 0

  return (
    <section className="search-panel search-panel-ai" aria-label={t('jobs.searchPanelAria')}>
      <header className="search-panel-ai-header">
        <Sparkles className="search-panel-ai-sparkle" aria-hidden="true" />
        <div className="search-panel-ai-heading">
          <h2 className="search-panel-ai-title">{t('jobs.searchTitle')}</h2>
          <p className="search-panel-ai-subtitle">{t('jobs.searchSubtitle')}</p>
        </div>
      </header>

      <div className={`search-panel-composer${busy ? ' search-panel-composer-busy' : ''}`}>
        <textarea
          className="prompt-textarea prompt-textarea-ai"
          value={command.prompt_text ?? ''}
          onChange={(e) => onChange({ ...command, prompt_text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              if (!busy) onSearch()
            }
          }}
          placeholder={t('jobs.searchPlaceholder')}
          rows={2}
          aria-label={t('jobs.searchPromptAria')}
        />
        <div className="search-panel-composer-bar">
          <span className="search-panel-ai-shortcut">
            <kbd>Cmd</kbd>
            <span>+</span>
            <kbd>Invio</kbd>
          </span>
          <button type="button" className="search-btn search-btn-ai" onClick={onSearch} disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" />
                {parsing ? t('jobs.parsing') : t('jobs.searching')}
              </>
            ) : (
              <>
                {t('jobs.search')}
                <ArrowRight aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {showInterpretation && (
        <div className="search-panel-ai-interpretation">
          {parsing && interpretationItems.length === 0 ? (
            <p className="search-panel-ai-parsing">{t('jobs.interpreting')}</p>
          ) : (
            <PromptInterpretationChips items={interpretationItems} compact />
          )}
        </div>
      )}
    </section>
  )
}
