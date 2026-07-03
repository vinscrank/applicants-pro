import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { LightGrid } from '@/components/react-bits/LightGrid'

interface LightSectionProps {
  children: ReactNode
  className?: string
  id?: string
  overlap?: boolean
  grid?: boolean
  divider?: boolean
}

export function LightSection({
  children,
  className,
  id,
  overlap = false,
  grid = true,
  divider = false,
}: LightSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative z-20 bg-background text-foreground',
        overlap && '-mt-16 sm:-mt-[4.75rem] lg:-mt-20',
        !overlap && divider && 'border-t border-border/40',
        className,
      )}
    >
      <div
        className={cn(
          'relative',
          overlap &&
            'mx-3 rounded-t-[1.75rem] border border-border bg-background px-6 py-10 shadow-[0_-28px_64px_rgba(15,18,25,0.14)] ring-1 ring-black/[0.03] sm:mx-5 sm:rounded-t-[2rem] sm:px-8 sm:py-12 md:mx-8 lg:mx-12 lg:px-10 lg:py-14',
        )}
      >
        {grid ? <LightGrid className={cn('opacity-50', overlap && 'rounded-t-[1.75rem] sm:rounded-t-[2rem]')} /> : null}
        <div className={cn('relative mx-auto max-w-6xl', !overlap && 'px-5 sm:px-8 lg:px-10')}>{children}</div>
      </div>
    </section>
  )
}
