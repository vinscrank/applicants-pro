type Variant = 'draft' | 'applied' | 'interview' | 'offer' | 'closed' | 'success' | 'warning' | 'danger'

interface Props {
  label: string
  variant: Variant
  showDot?: boolean
}

export function StatusBadge({ label, variant, showDot = false }: Props) {
  return (
    <span className={`ui-status-badge ui-status-badge--${variant}`}>
      {showDot && <span className="ui-status-badge-dot" />}
      {label}
    </span>
  )
}
