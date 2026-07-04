import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '../../router'
import {
  getJobsSearchPhase,
  subscribeJobsSearchPhase,
  type JobsSearchPhase,
} from '../jobsSearchProgress'
import './JobsSearchBanner.css'

export function JobsSearchBanner() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<JobsSearchPhase>(() => getJobsSearchPhase())

  useEffect(() => subscribeJobsSearchPhase(setPhase), [])

  if (phase === 'idle') return null

  const phaseLabel =
    phase === 'parsing' ? t('jobs.searchBanner.parsing') : t('jobs.searchBanner.searching')

  return (
    <div className="jobs-search-banner" role="status" aria-live="polite">
      <div className="jobs-search-banner-inner">
        <span className="jobs-search-banner-spinner" aria-hidden="true" />
        <div className="jobs-search-banner-copy">
          <strong>{phaseLabel}</strong>
          <span>{t('jobs.searchBanner.backgroundHint')}</span>
        </div>
        <button
          type="button"
          className="jobs-search-banner-link"
          onClick={() => navigate({ page: 'discover', tab: 'search' })}
        >
          {t('jobs.title')}
        </button>
      </div>
    </div>
  )
}
