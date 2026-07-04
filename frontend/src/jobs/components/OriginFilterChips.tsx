import type { OfferOrigin } from '../types'
import { ORIGIN_FILTER_OPTIONS } from '../offerOrigin'
import { OriginGlyph } from './OfferOriginIcon'
import './OriginFilterChips.css'

interface Props {
  selected: OfferOrigin[]
  onChange: (origins: OfferOrigin[]) => void
}

export function OriginFilterChips({ selected, onChange }: Props) {
  const toggle = (origin: OfferOrigin) => {
    if (selected.includes(origin)) {
      onChange(selected.filter((item) => item !== origin))
      return
    }
    onChange([...selected, origin])
  }

  return (
    <div className="origin-filter-chips">
      {ORIGIN_FILTER_OPTIONS.map((option) => {
        const active = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            className={`origin-filter-chip offer-origin-${option.value}${active ? ' is-active' : ''}`}
            onClick={() => toggle(option.value)}
            aria-pressed={active}
            title={option.label}
          >
            <OriginGlyph origin={option.value} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
