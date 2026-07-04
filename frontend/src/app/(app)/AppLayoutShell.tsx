'use client'

import dynamic from 'next/dynamic'
import { StaticRouteLoading } from '@/components/shell/StaticRouteLoading'

const AppLayoutClient = dynamic(() => import('./AppLayoutClient'), {
  ssr: false,
  loading: () => <StaticRouteLoading fullScreen />,
})

export function AppLayoutShell({ children }: { children: React.ReactNode }) {
  return <AppLayoutClient>{children}</AppLayoutClient>
}
