import './ResultsPipelineBar.css'

interface Props {
  validCount: number
  dismissedCount: number
  activeView: 'valid' | 'dismissed'
  onShowValid: () => void
  onShowDismissed: () => void
  searchTerms?: string[]
}

export function ResultsPipelineBar({
  validCount,
  dismissedCount,
  activeView,
  onShowValid,
  onShowDismissed,
  searchTerms = [],
}: Props) {
  const total = validCount + dismissedCount

  return (
    <div className="results-pipeline-bar card">
      <div className="results-pipeline-head">
        <span className="results-pipeline-title">{total} raccolte dalla ricerca</span>
        {searchTerms.length > 0 && (
          <span className="results-pipeline-terms" title="Termini estratti dal prompt">
            Prompt: {searchTerms.slice(0, 4).join(' · ')}
            {searchTerms.length > 4 ? ` +${searchTerms.length - 4}` : ''}
          </span>
        )}
      </div>
      <div className="results-pipeline-actions" role="tablist" aria-label="Vista risultati">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'valid'}
          className={`results-pipeline-btn results-pipeline-valid${activeView === 'valid' ? ' active' : ''}`}
          onClick={onShowValid}
        >
          <span className="results-pipeline-count">{validCount}</span>
          <span className="results-pipeline-label">Candidabili</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === 'dismissed'}
          className={`results-pipeline-btn results-pipeline-dismissed${activeView === 'dismissed' ? ' active' : ''}`}
          onClick={onShowDismissed}
        >
          <span className="results-pipeline-count">{dismissedCount}</span>
          <span className="results-pipeline-label">Scartate da te</span>
        </button>
      </div>
    </div>
  )
}
