'use client'

import { useEffect } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { RoutePageLoading } from '@/components/shell/RoutePageLoading'
import { appReplace } from '@/lib/navigation'
import { defaultAuthedRoute, routeToPath } from '@/router'
import { LandingPage } from '@/landing/LandingPage'

export default function HomePage() {
  const { loading, user, profile } = useAuth()

  useEffect(() => {
    if (loading) return
    if (user) {
      appReplace(routeToPath(defaultAuthedRoute(Boolean(profile?.profile_complete))))
    }
  }, [loading, user, profile])

  if (loading || user) return <RoutePageLoading fullScreen />
  return <LandingPage />
}
