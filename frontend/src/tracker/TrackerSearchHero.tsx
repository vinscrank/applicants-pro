interface Props {
  value: string
  onChange: (value: string) => void
  resultCount: number
  totalCount: number
  aboveTable?: boolean
}

export function TrackerSearchHero({ value, onChange, resultCount, totalCount, aboveTable = false }: Props) {
  const trimmed = value.trim()
  return (
    <section
      className={`tracker-search-hero${aboveTable ? ' tracker-search-hero-above-table' : ' card'}`}
      aria-label="Cerca nel tracker"
    >
      <div className={`tracker-search-hero-inner${aboveTable ? ' tracker-search-hero-inner-compact' : ''}`}>
        {!aboveTable && (
          <div className="tracker-search-hero-copy">
            <p className="tracker-search-hero-kicker">Funzione principale</p>
            <h2 className="tracker-search-hero-title">Cerca nel tracker</h2>
            <p className="tracker-search-hero-sub">
              Azienda, ruolo, location o recruiter — risultati immediati mentre digiti.
            </p>
          </div>
        )}
        <label className="tracker-search-hero-field">
          {aboveTable && (
            <span className="tracker-search-hero-inline-label">Cerca nel tracker</span>
          )}
          <div className="tracker-search-hero-input-row">
            <span className="tracker-search-hero-icon" aria-hidden="true" />
            <input
              type="search"
              className="tracker-search-hero-input"
              placeholder="Es. Stripe, React, Dublin, Maria Rossi..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus={aboveTable}
            />
            {trimmed ? (
              <span className="tracker-search-hero-count">
                {resultCount} di {totalCount}
              </span>
            ) : (
              <span className="tracker-search-hero-count tracker-search-hero-count-idle">
                {totalCount}
              </span>
            )}
          </div>
        </label>
      </div>
    </section>
  )
}
