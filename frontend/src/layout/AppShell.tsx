'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShellSidebar, routeToShellNav, type ShellNavId } from '@/layout/AppShellSidebar'
import { AppHeader } from '@/layout/AppHeader'
import { CommandMenu, useCommandMenu } from '@/layout/CommandMenu'
import type { AppRoute } from '@/router'
import { readNewCareersMatchCount } from '@/careers-recent/careersScanAlerts'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { LightGrid } from '@/components/react-bits'
import { cn } from '@/lib/utils'

interface AppShellProps {
  route: AppRoute
  email: string
  planLabel?: string
  trackerTotal?: number
  onLogout: () => void
  children: ReactNode
}

export function AppShell({
  route,
  email,
  planLabel,
  trackerTotal,
  onLogout,
  children,
}: AppShellProps) {
  const { t } = useTranslation()
  const { open, setOpen } = useCommandMenu()
  const [mobileNav, setMobileNav] = useState(false)
  const [discoverMatchCount, setDiscoverMatchCount] = useState(0)
  const activeNav: ShellNavId = routeToShellNav(route)

  useEffect(() => {
    const refresh = () => setDiscoverMatchCount(readNewCareersMatchCount())
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('careers-match-alert', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('careers-match-alert', refresh)
    }
  }, [route])

  const sidebar = (
    <AppShellSidebar
      activeNav={activeNav}
      email={email}
      planLabel={planLabel}
      trackerTotal={trackerTotal}
      discoverMatchCount={discoverMatchCount}
      onLogout={onLogout}
      onNavigate={() => setMobileNav(false)}
    />
  )

  return (
    <div className="relative min-h-screen bg-background">
      <LightGrid className="fixed opacity-50" />
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[260px] lg:flex-col">
        {sidebar}
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[min(100vw-2rem,280px)] border-r-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-screen flex-col lg:pl-[260px]')}>
        <AppHeader onOpenCommand={() => setOpen(true)} onOpenNav={() => setMobileNav(true)} />
        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <CommandMenu open={open} onOpenChange={setOpen} />
    </div>
  )
}
