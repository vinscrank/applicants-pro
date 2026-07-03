import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'
import type { Application, Stats } from '@/types'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'

export interface UseApplicationsQueryOptions {
  excludeRejected?: boolean
  includeDrafts?: boolean
  includeStats?: boolean
  enabled?: boolean
}

export function useApplicationsQuery(options: UseApplicationsQueryOptions = {}) {
  const { excludeRejected = false, includeDrafts = false, includeStats = false, enabled = true } = options
  const { t } = useTranslation()
  const quickAdd = useQuickAddOptional()
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const appsPromise = api.getApplications({
        exclude_rejected: excludeRejected,
        include_drafts: includeDrafts,
      })
      if (includeStats) {
        const [apps, st] = await Promise.all([appsPromise, api.getStats()])
        setApplications(apps)
        setStats(st)
      } else {
        setApplications(await appsPromise)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.genericLoad'))
      setApplications([])
      if (includeStats) setStats(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, excludeRejected, includeDrafts, includeStats, t])

  useEffect(() => {
    void refetch()
  }, [refetch, quickAdd?.refreshKey])

  return {
    applications,
    stats,
    loading,
    error,
    setApplications,
    setStats,
    refetch,
  }
}
