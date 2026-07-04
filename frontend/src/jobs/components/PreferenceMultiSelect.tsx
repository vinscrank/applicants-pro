import { useState } from 'react'
import './PreferenceMultiSelect.css'

export interface MultiSelectOption {
  value: string
  label: string
}

interface Props {
  label: string
  options: MultiSelectOption[]
  values: string[]
  onChange: (values: string[]) => void
  allowCustom?: boolean
  customPlaceholder?: string
}

export function PreferenceMultiSelect({
  label,
  options,
  values,
  onChange,
  allowCustom = false,
  customPlaceholder = '',
}: Props) {
  const [customDraft, setCustomDraft] = useState('')

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
      return
    }
    onChange([...values, value])
  }

  const removeCustom = (value: string) => {
    onChange(values.filter((v) => v !== value))
  }

  const addCustom = () => {
    const value = customDraft.trim()
    if (!value || values.includes(value)) return
    onChange([...values, value])
    setCustomDraft('')
  }

  return (
    <div className="pref-multiselect">
      <span className="pref-multiselect-label">{label}</span>
      {options.length > 0 && (
        <div className="pref-multiselect-grid" role="group" aria-label={label}>
          {options.map((option) => {
            const active = values.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className={`pref-multiselect-chip${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => toggle(option.value)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      )}
      {allowCustom && (
        <div className="pref-multiselect-add">
          <input
            type="text"
            className="pref-multiselect-add-input"
            value={customDraft}
            placeholder={customPlaceholder}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <button type="button" className="pref-multiselect-add-btn" onClick={addCustom}>
            Aggiungi
          </button>
        </div>
      )}
      {allowCustom && values.length > 0 && (
        <div className="pref-multiselect-custom">
          {values.map((value) => (
            <span key={value} className="pref-multiselect-custom-chip">
              {value}
              <button type="button" onClick={() => removeCustom(value)} aria-label={`Rimuovi ${value}`}>
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
