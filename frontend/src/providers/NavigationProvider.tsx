'use client'

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { registerAppNavigation } from '@/lib/navigation'
import { NavigationLoadingOverlay } from '@/components/shell/NavigationLoadingOverlay'
import { NavigationProgress } from '@/components/shell/NavigationProgress'

const OVERLAY_MAX_MS = 5000

const NavigationLoadingContext = createContext(false)

export function useNavigationLoading(): boolean {
  return useContext(NavigationLoadingContext)
}

function currentRouteKey(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.pathname}${window.location.search}`
}

function hrefToRouteKey(href: string): string {
  if (typeof window === 'undefined') return href
  const url = new URL(href, window.location.origin)
  return `${url.pathname}${url.search}`
}

function NavigationRouteSync({ onRouteSettled }: { onRouteSettled: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`

  useEffect(() => {
    onRouteSettled()
  }, [routeKey, onRouteSettled])

  return null
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)
  const [, startTransition] = useTransition()
  const overlayTimerRef = useRef<number | null>(null)

  const clearOverlayTimer = useCallback(() => {
    if (overlayTimerRef.current != null) {
      window.clearTimeout(overlayTimerRef.current)
      overlayTimerRef.current = null
    }
  }, [])

  const settleNavigation = useCallback(() => {
    clearOverlayTimer()
    setNavigating(false)
  }, [clearOverlayTimer])

  const beginNavigation = useCallback(() => {
    clearOverlayTimer()
    setNavigating(true)
    overlayTimerRef.current = window.setTimeout(() => {
      setNavigating(false)
      overlayTimerRef.current = null
    }, OVERLAY_MAX_MS)
  }, [clearOverlayTimer])

  useEffect(() => {
    registerAppNavigation((href, replace) => {
      if (hrefToRouteKey(href) === currentRouteKey()) return
      beginNavigation()
      startTransition(() => {
        if (replace) router.replace(href)
        else router.push(href)
      })
    })
  }, [router, beginNavigation])

  useEffect(() => () => clearOverlayTimer(), [clearOverlayTimer])

  return (
    <NavigationLoadingContext.Provider value={navigating}>
      <NavigationProgress />
      <NavigationLoadingOverlay />
      <Suspense fallback={null}>
        <NavigationRouteSync onRouteSettled={settleNavigation} />
      </Suspense>
      {children}
    </NavigationLoadingContext.Provider>
  )
}
