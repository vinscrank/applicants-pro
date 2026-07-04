import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { CareersSmartFilterId } from '@/careers-recent/careersSmartFilters'

interface Props {
  active: Set<CareersSmartFilterId>
  onChange: (next: Set<CareersSmartFilterId>) => void
  disabled?: boolean
}

const FILTER_IDS: CareersSmartFilterId[] = ['untracked', 'remote', 'priority', 'today']

export function CareersSmartFiltersBar({ active, onChange, disabled = false }: Props) {
  const { t } = useTranslation()

  const toggle = (id: CareersSmartFilterId) => {
    const next = new Set(active)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  return (
    <div className="careers-smart-filters" role="group" aria-label={t('careersHub.smartFiltersLabel')}>
      {FILTER_IDS.map((id) => {
        const selected = active.has(id)
        return (
          <button
            key={id}
            type="button"
            className={cn('careers-smart-filter-chip', selected && 'active')}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => toggle(id)}
          >
            {t(`careersHub.smartFilters.${id}`)}
          </button>
        )
      })}
    </div>
  )
}
