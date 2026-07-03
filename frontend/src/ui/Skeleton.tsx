interface Props {
  variant?: 'text' | 'title' | 'card'
  width?: string | number
  height?: string | number
}

export function Skeleton({ variant = 'text', width, height }: Props) {
  const variantClass = variant !== 'text' ? ` ui-skeleton-${variant}` : ' ui-skeleton-text'
  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return <div className={`ui-skeleton${variantClass}`} style={style} />
}

export function SkeletonCard() {
  return (
    <div className="ui-card" style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Skeleton variant="title" />
      <Skeleton width="80%" />
      <Skeleton width="60%" />
    </div>
  )
}
