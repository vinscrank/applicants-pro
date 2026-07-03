import '../assistant/assistant.css'

interface Props {
  score?: number
  label?: string
  available?: boolean
}

function tone(score: number): string {
  if (score >= 70) return 'profile-fit-high'
  if (score >= 50) return 'profile-fit-mid'
  return 'profile-fit-low'
}

export function ProfileFitBadge({ score = 0, label = '', available = false }: Props) {
  if (!available || score <= 0) return null
  return (
    <span className={`profile-fit-badge ${tone(score)}`} title={label || undefined}>
      Fit profilo {score}%
    </span>
  )
}
