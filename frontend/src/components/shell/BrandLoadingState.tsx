'use client'

import { useTranslation } from 'react-i18next'
import { GradientText, MeshBackground } from '@/components/react-bits'
import { cn } from '@/lib/utils'

interface BrandLoadingStateProps {
  label?: string
  fullScreen?: boolean
  compact?: boolean
}

export function BrandLoadingState({ label, fullScreen = false, compact = false }: BrandLoadingStateProps) {
  const { t } = useTranslation()
  const text = label ?? t('app.loading')

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center px-6',
        fullScreen && 'min-h-screen overflow-hidden',
        !fullScreen && !compact && 'min-h-[50vh]',
        compact && 'py-2',
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {fullScreen ? <MeshBackground className="absolute inset-0" /> : null}
      {!fullScreen && !compact ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4a8fb8]/10 blur-3xl"
            style={{ animation: 'mesh-drift-a 14s ease-in-out infinite alternate' }}
          />
        </div>
      ) : null}

      <div className={cn('relative z-10 flex flex-col items-center', compact ? 'gap-3' : 'gap-5')}>
        <div
          className={cn('brand-loading-orb', compact && 'brand-loading-orb-compact')}
          aria-hidden
        >
          <span className="brand-loading-ring brand-loading-ring-a" />
          <span className="brand-loading-ring brand-loading-ring-b" />
          <span className="brand-loading-core" />
        </div>

        <GradientText
          className={cn(
            'font-display font-medium tracking-wide',
            compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base',
          )}
          animationSpeed={8}
        >
          {text}
        </GradientText>
      </div>
    </div>
  )
}
