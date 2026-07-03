import { useEffect } from 'react'
import { isLegacyPage, navigate, parseRoute } from '@/router'

export function useLegacyRouteRedirect() {
  useEffect(() => {
    const sync = () => {
      const raw = window.location.hash.replace(/^#/, '').trim()
      const page = raw.split('?')[0].replace(/^\/+/, '')
      if (!page || !isLegacyPage(page)) return
      navigate(parseRoute(), true)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
}
