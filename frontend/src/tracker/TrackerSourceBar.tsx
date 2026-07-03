export type TrackerSourceFilter = 'all' | 'offerte_live' | 'manual'

interface Props {
  active: TrackerSourceFilter
  counts: { all: number; offerte_live: number; manual: number }
  onChange: (value: TrackerSourceFilter) => void
}

const TABS: { id: TrackerSourceFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'Tutte', hint: 'Tutte le candidature' },
  { id: 'offerte_live', label: 'Da Offerte Live', hint: 'Registrate dalla ricerca batch' },
  { id: 'manual', label: 'Manuali e analisi', hint: 'Inserite a mano o da Analizza annuncio' },
]

export function TrackerSourceBar({ active, counts, onChange }: Props) {
  return (
    <section className="tracker-source-bar card" aria-label="Filtra per origine">
      {TABS.map((tab) => {
        const count = counts[tab.id]
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            className={`tracker-source-tab${isActive ? ' active' : ''}${tab.id === 'offerte_live' ? ' tracker-source-tab-live' : ''}`}
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
