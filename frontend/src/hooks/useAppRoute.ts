'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { parseRouteFromUrl, type AppRoute } from '@/router'

export function useAppRoute(): AppRoute {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return useMemo(
    () => parseRouteFromUrl(pathname, searchParams),
    [pathname, searchParams],
  )
}
