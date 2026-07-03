'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { RoutePageLoading } from '@/components/shell/RoutePageLoading'
import { AppShell } from '@/layout/AppShell'
import { appReplace } from '@/lib/navigation'
import { OfferteSearchBanner } from '@/offerte/components/OfferteSearchBanner'
import { V2MigrationBanner } from '@/layout/V2MigrationBanner'
import { billingApi, type BillingStatus } from '@/billing/api'
import { api } from '@/api'
import {
  defaultAuthedRoute,
  isAuthRoute,
  navigate,
  routeToPath,
  type AppRoute,
} from '@/router'
import { useAppRoute } from '@/hooks/useAppRoute'
import { useLegacyRouteRedirect } from '@/hooks/useLegacyRouteRedirect'

interface AppShellLayoutProps {
  children: React.ReactNode
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const { loading, user, profile, logout } = useAuth()
  const route = useAppRoute()
  useLegacyRouteRedirect()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [trackerCounts, setTrackerCounts] = useState({ total: 0 })

  useEffect(() => {
    if (!user) {
      setBilling(null)
      setTrackerCounts({ total: 0 })
      return
    }
    billingApi.status().then(setBilling).catch(() => setBilling(null))
  }, [user])

  useEffect(() => {
    if (!user) return
    api
      .getApplications({ exclude_rejected: true })
      .then((apps) => setTrackerCounts({ total: apps.length }))
      .catch(() => setTrackerCounts({ total: 0 }))
  }, [user, route.page])

  useEffect(() => {
    if (loading) return
    if (!user) {
      appReplace('/login')
      return
    }
    if (isAuthRoute(route)) {
      appReplace(routeToPath(defaultAuthedRoute(Boolean(profile?.profile_complete))))
      return
    }
    const profileOptionalPages = new Set<AppRoute['page']>([
      'account',
      'discover',
      'dashboard',
      'progress',
    ])
    if (!profile?.profile_complete && !profileOptionalPages.has(route.page)) {
      appReplace('/account?tab=profile')
    }
  }, [loading, user, profile, route])

  const handleLogout = () => {
    logout()
    navigate({ page: 'landing' }, true)
  }

  if (loading || !user) {
    return <RoutePageLoading fullScreen />
  }

  const planLabel =
    billing?.plan_id === 'owner'
      ? 'Completo'
      : billing?.plan_id && billing.plan_id !== 'free'
        ? billing.plan_name
        : undefined

  return (
    <AppShell
      route={route}
      email={user.email}
      planLabel={planLabel}
      trackerTotal={trackerCounts.total}
      onLogout={handleLogout}
    >
      <V2MigrationBanner />
      {children}
      <OfferteSearchBanner />
    </AppShell>
  )
}
