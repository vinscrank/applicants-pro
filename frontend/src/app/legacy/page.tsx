'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  isLegacyPage,
  parseRouteFromHash,
  routeToPath,
} from '@/router'

export default function LegacyRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '').trim()
    if (!hash) {
      router.replace('/')
      return
    }
    const page = hash.split('?')[0].replace(/^\/+/, '')
    if (isLegacyPage(page)) {
      const route = parseRouteFromHash(hash)
      router.replace(routeToPath(route))
      return
    }
    const route = parseRouteFromHash(hash)
    router.replace(routeToPath(route))
  }, [router])

  return null
}
