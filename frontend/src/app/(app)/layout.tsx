'use client'

import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShellLayout } from '@/components/shell/AppShellLayout'

function AppLayoutFallback() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>{t('app.loading')}</p>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AppLayoutFallback />}>
      <AppShellLayout>{children}</AppShellLayout>
    </Suspense>
  )
}
