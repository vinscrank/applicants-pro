'use client'

import { useTranslation } from 'react-i18next'
import { BrandLoadingState } from '@/components/shell/BrandLoadingState'
import { useNavigationLoading } from '@/providers/NavigationProvider'

export function NavigationLoadingOverlay() {
  const { t } = useTranslation()
  const isNavigating = useNavigationLoading()

  if (!isNavigating) return null

  return (
    <div
      className="fixed inset-0 z-[199] flex items-center justify-center bg-[#f8fafc]/55 backdrop-blur-xl dark:bg-[#0f1219]/45"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t('app.navigating')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-[10%] top-[18%] h-[38%] w-[38%] rounded-full bg-[#2d5a7b]/12 blur-3xl"
          style={{ animation: 'mesh-drift-b 16s ease-in-out infinite alternate' }}
        />
        <div
          className="absolute -right-[8%] bottom-[12%] h-[34%] w-[34%] rounded-full bg-[#7eb8d4]/14 blur-3xl"
          style={{ animation: 'mesh-drift-c 18s ease-in-out infinite alternate' }}
        />
      </div>
      <BrandLoadingState compact label={t('app.navigating')} />
    </div>
  )
}
