'use client'

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { registerAppNavigation } from '@/lib/navigation'
import { NavigationLoadingOverlay } from '@/components/shell/NavigationLoadingOverlay'
import { NavigationProgress } from '@/components/shell/NavigationProgress'

const NavigationLoadingContext = createContext(false)

export function useNavigationLoading(): boolean {
  return useContext(NavigationLoadingContext)
}

function NavigationRouteSync({ onRouteChange }: { onRouteChange: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = `${pathname}?${searchParams.toString()}`

  useEffect(() => {
    onRouteChange()
  }, [routeKey, onRouteChange])

  return null
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [navigating, setNavigating] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    registerAppNavigation((href, replace) => {
      setNavigating(true)
      startTransition(() => {
        if (replace) router.replace(href)
        else router.push(href)
      })
    })
  }, [router])

  const isNavigating = navigating || isPending

  const onRouteChange = useCallback(() => {
    window.setTimeout(() => setNavigating(false), 150)
  }, [])

  return (
    <NavigationLoadingContext.Provider value={isNavigating}>
      <NavigationProgress />
      <NavigationLoadingOverlay />
      <Suspense fallback={null}>
        <NavigationRouteSync onRouteChange={onRouteChange} />
      </Suspense>
      {children}
    </NavigationLoadingContext.Provider>
  )
}
