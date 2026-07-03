'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseRouteFromHash, routeToPath } from '@/router'

export function HashRedirect() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '').trim()
    if (!hash) return
    const route = parseRouteFromHash(hash)
    router.replace(routeToPath(route))
  }, [router])

  return null
}
