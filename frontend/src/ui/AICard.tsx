import type { ReactNode } from 'react'

interface Props {
  message: string
  actions?: ReactNode
  onDismiss?: () => void
}

const aiIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
  </svg>
)

const closeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export function AICard({ message, actions, onDismiss }: Props) {
  return (
    <div className="ui-ai-card">
      <span className="ui-ai-card-icon">{aiIcon}</span>
      <div className="ui-ai-card-content">
        <p className="ui-ai-card-message">{message}</p>
        {actions && <div className="ui-ai-card-actions">{actions}</div>}
      </div>
      {onDismiss && (
        <button type="button" className="ui-ai-card-dismiss" onClick={onDismiss} aria-label="Chiudi">
          {closeIcon}
        </button>
      )}
    </div>
  )
}
