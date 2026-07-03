import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ListRowProps {
  children: ReactNode
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export function ListRow({ children, icon, onClick, className }: ListRowProps) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left shadow-sm transition-colors',
        onClick && 'hover:bg-muted/60 hover:border-border/80',
        className,
      )}
    >
      {icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
      ) : null}
      {children}
    </Comp>
  )
}
