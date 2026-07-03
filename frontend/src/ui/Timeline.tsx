import type { ReactNode } from 'react'

type DotVariant = 'default' | 'primary' | 'success' | 'warning'

interface TimelineItemData {
  id: string
  title: string
  meta?: string
  variant?: DotVariant
}

interface TimelineProps {
  items: TimelineItemData[]
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="ui-timeline">
      {items.map((item) => (
        <div key={item.id} className="ui-timeline-item">
          <span className={`ui-timeline-dot${item.variant && item.variant !== 'default' ? ` ui-timeline-dot--${item.variant}` : ''}`} />
          <div className="ui-timeline-content">
            <p className="ui-timeline-title">{item.title}</p>
            {item.meta && <p className="ui-timeline-meta">{item.meta}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

interface TimelineItemProps {
  title: string
  meta?: string
  variant?: DotVariant
  children?: ReactNode
}

export function TimelineItem({ title, meta, variant = 'default', children }: TimelineItemProps) {
  return (
    <div className="ui-timeline-item">
      <span className={`ui-timeline-dot${variant !== 'default' ? ` ui-timeline-dot--${variant}` : ''}`} />
      <div className="ui-timeline-content">
        <p className="ui-timeline-title">{title}</p>
        {meta && <p className="ui-timeline-meta">{meta}</p>}
        {children}
      </div>
    </div>
  )
}
