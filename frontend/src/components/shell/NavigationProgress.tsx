'use client'

import { useTranslation } from 'react-i18next'
import { useNavigationLoading } from '@/providers/NavigationProvider'

export function NavigationProgress() {
  const { t } = useTranslation()
  const isNavigating = useNavigationLoading()

  if (!isNavigating) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden bg-[#2d5a7b]/10"
      role="status"
      aria-live="polite"
      aria-label={t('app.navigating')}
    >
      <div className="navigation-progress-bar h-full w-[42%] rounded-full bg-gradient-to-r from-[#1a1f36] via-[#4a8fb8] to-[#7eb8d4] shadow-[0_0_16px_rgba(74,143,184,0.55)]" />
    </div>
  )
}
