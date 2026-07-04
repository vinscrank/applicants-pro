import { useTranslation } from 'react-i18next'

export type TrackerSourceFilter = 'all' | 'live_jobs' | 'manual'

interface Props {
  active: TrackerSourceFilter
  counts: { all: number; live_jobs: number; manual: number }
  onChange: (value: TrackerSourceFilter) => void
}

export function TrackerSourceBar({ active, counts, onChange }: Props) {
  const { t } = useTranslation()
  const tabs: { id: TrackerSourceFilter; label: string; hint: string }[] = [
    { id: 'all', label: t('candidature.trackerSource.all'), hint: t('candidature.trackerSource.allHint') },
    { id: 'live_jobs', label: t('candidature.trackerSource.liveJobs'), hint: t('candidature.trackerSource.liveJobsHint') },
    { id: 'manual', label: t('candidature.trackerSource.manual'), hint: t('candidature.trackerSource.manualHint') },
  ]

  return (
    <section className="tracker-source-bar card" aria-label={t('candidature.trackerSource.ariaLabel')}>
      {tabs.map((tab) => {
        const count = counts[tab.id]
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            className={`tracker-source-tab${isActive ? ' active' : ''}${tab.id === 'live_jobs' ? ' tracker-source-tab-live' : ''}`}
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
          >
            <span className="tracker-source-tab-label">{tab.label}</span>
            <span className="tracker-source-tab-count">{count}</span>
            <span className="tracker-source-tab-hint">{tab.hint}</span>
          </button>
        )
      })}
    </section>
  )
}
