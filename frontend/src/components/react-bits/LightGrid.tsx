import { cn } from '@/lib/utils'

interface LightGridProps {
  className?: string
}

export function LightGrid({ className }: LightGridProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(26,31,54,0.06) 1px, transparent 0)',
        backgroundSize: '24px 24px',
        maskImage: 'linear-gradient(to bottom, black 0%, transparent 88%)',
      }}
    />
  )
}
