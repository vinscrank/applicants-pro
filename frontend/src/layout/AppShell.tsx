'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { AppShellSidebar, routeToShellNav, type ShellNavId } from '@/layout/AppShellSidebar'
import { AppHeader } from '@/layout/AppHeader'
import { CommandMenu, useCommandMenu } from '@/layout/CommandMenu'
import type { AppRoute } from '@/router'
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
  const { open, setOpen } = useCommandMenu()
  const [mobileNav, setMobileNav] = useState(false)
  const activeNav: ShellNavId = routeToShellNav(route)

  const sidebar = (
    <AppShellSidebar
      activeNav={activeNav}
      email={email}
      planLabel={planLabel}
      trackerTotal={trackerTotal}
      onLogout={onLogout}
      onNavigate={() => setMobileNav(false)}
    />
  )

  return (
    <div className="relative min-h-screen bg-background">
      <LightGrid className="fixed opacity-50" />
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        {sidebar}
      </aside>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-72 border-r-0 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-screen flex-col lg:pl-64')}>
        <AppHeader onOpenCommand={() => setOpen(true)} onOpenNav={() => setMobileNav(true)} />
        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>

      <CommandMenu open={open} onOpenChange={setOpen} />
    </div>
  )
}
