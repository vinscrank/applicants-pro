'use client'

import { Suspense } from 'react'
import { AppShellLayout } from '@/components/shell/AppShellLayout'
import { RoutePageLoading } from '@/components/shell/RoutePageLoading'

export default function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RoutePageLoading fullScreen />}>
      <AppShellLayout>{children}</AppShellLayout>
    </Suspense>
  )
}
