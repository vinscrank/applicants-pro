import { useEffect, useState } from 'react'
import { navigate } from '../../router'
import {
  getOfferteSearchPhase,
  subscribeOfferteSearchPhase,
  type OfferteSearchPhase,
} from '../offerteSearchProgress'
import './OfferteSearchBanner.css'

function phaseLabel(phase: OfferteSearchPhase): string {
  if (phase === 'parsing') return 'Analisi del prompt in corso'
  return 'Ricerca offerte in corso'
}

export function OfferteSearchBanner() {
  const [phase, setPhase] = useState<OfferteSearchPhase>(() => getOfferteSearchPhase())

  useEffect(() => subscribeOfferteSearchPhase(setPhase), [])

  if (phase === 'idle') return null

  return (
    <div className="offerte-search-banner" role="status" aria-live="polite">
      <div className="offerte-search-banner-inner">
        <span className="offerte-search-banner-spinner" aria-hidden="true" />
        <div className="offerte-search-banner-copy">
          <strong>{phaseLabel(phase)}</strong>
          <span>Puoi continuare a usare il sito mentre lavoriamo in background.</span>
        </div>
        <button
          type="button"
          className="offerte-search-banner-link"
          onClick={() => navigate({ page: 'discover', tab: 'search' })}
        >
          Offerte Live
        </button>
      </div>
    </div>
  )
}
