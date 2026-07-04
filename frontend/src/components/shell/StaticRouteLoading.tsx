import { cn } from '@/lib/utils'

interface StaticRouteLoadingProps {
  fullScreen?: boolean
}

export function StaticRouteLoading({ fullScreen = false }: StaticRouteLoadingProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        fullScreen ? 'min-h-screen' : 'min-h-[50vh]',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="brand-loading-orb" aria-hidden>
        <span className="brand-loading-ring brand-loading-ring-a" />
        <span className="brand-loading-ring brand-loading-ring-b" />
        <span className="brand-loading-core" />
      </div>
    </div>
  )
}
