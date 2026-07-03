'use client'

import { Aurora } from './Aurora'
import { MeshBackground } from './MeshBackground'
import { NoiseGrain } from './NoiseGrain'
import { AURORA_STOPS, AURORA_STOPS_DARK, BRAND_INK } from './brand'
import { cn } from '@/lib/utils'

type SceneVariant = 'hero' | 'auth' | 'app' | 'light'

interface SceneBackgroundProps {
  variant?: SceneVariant
  className?: string
}

export function SceneBackground({ variant = 'light', className }: SceneBackgroundProps) {
  if (variant === 'hero') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
        <div className="absolute inset-0" style={{ background: `linear-gradient(165deg, ${BRAND_INK} 0%, #141824 45%, ${BRAND_INK} 100%)` }} />
        <Aurora colorStops={AURORA_STOPS_DARK} amplitude={0.75} blend={0.5} speed={0.28} className="opacity-90" />
        <NoiseGrain opacity={0.055} />
      </div>
    )
  }

  if (variant === 'auth') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
        <div className="absolute inset-0 bg-[var(--color-primary)]" />
        <Aurora colorStops={AURORA_STOPS} amplitude={0.65} blend={0.45} speed={0.22} className="opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />
        <NoiseGrain opacity={0.06} />
      </div>
    )
  }

  if (variant === 'app') {
    return (
      <div className={cn('pointer-events-none fixed inset-0 overflow-hidden', className)} aria-hidden>
        <MeshBackground className="opacity-50" />
        <Aurora
          colorStops={AURORA_STOPS}
          amplitude={0.35}
          blend={0.35}
          speed={0.15}
          className="opacity-[0.18] [mask-image:linear-gradient(to_bottom,black_0%,transparent_42%)]"
        />
        <NoiseGrain opacity={0.025} />
      </div>
    )
  }

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      <MeshBackground />
      <NoiseGrain opacity={0.03} />
    </div>
  )
}
