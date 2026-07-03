import type { ReactNode } from 'react'
import { FadeIn } from '@/components/react-bits'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  compact?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
  compact = false,
  className,
}: PageHeaderProps) {
  return (
    <FadeIn>
      <header
        className={cn(
          'flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between',
          compact ? 'pb-3' : 'pb-5',
          className,
        )}
      >
      <div className="min-w-0 space-y-1.5">
        <h1
          className={cn(
            'font-display font-semibold tracking-tight text-foreground',
            compact ? 'text-xl' : 'text-2xl sm:text-3xl',
          )}
        >
          {title}
        </h1>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        {meta ? <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
    </FadeIn>
  )
}
