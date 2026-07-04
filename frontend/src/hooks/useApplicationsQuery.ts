'use client'

import { useQuery } from '@apollo/client/react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  APPLICATIONS_PAGE_INPUT,
  watchFetchPolicy,
} from '@/graphql/policies'
import { GET_APPLICATIONS_PAGE, GET_APPLICATION_STATS } from '@/graphql/queries'
import {
  filterApplicationsList,
  gqlStatsToStats,
  gqlToApplication,
} from '@/lib/application-mapper'
import type { Application, Stats } from '@/types'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'

export interface UseApplicationsQueryOptions {
  excludeRejected?: boolean
  includeDrafts?: boolean
  includeStats?: boolean
  enabled?: boolean
}

export function useApplicationsQuery(
  options: UseApplicationsQueryOptions = {},
) {
  const {
    excludeRejected = false,
    includeDrafts = false,
    includeStats = false,
    enabled = true,
  } = options
  const { t } = useTranslation()
  const quickAdd = useQuickAddOptional()

  const {
    data: appsData,
    loading: appsLoading,
    error: appsError,
    refetch: refetchApps,
  } = useQuery(GET_APPLICATIONS_PAGE, {
    skip: !enabled,
    variables: { input: APPLICATIONS_PAGE_INPUT },
    fetchPolicy: watchFetchPolicy.list,
  })

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery(GET_APPLICATION_STATS, {
    skip: !enabled || !includeStats,
    fetchPolicy: watchFetchPolicy.list,
  })

  useEffect(() => {
    if (!enabled || !quickAdd?.refreshKey) return
    void refetchApps()
    if (includeStats) void refetchStats()
  }, [enabled, includeStats, quickAdd?.refreshKey, refetchApps, refetchStats])

  const applications = useMemo((): Application[] => {
    const rows = (appsData?.applicationsPage?.items ?? []).map(gqlToApplication)
    return filterApplicationsList(rows, {
      exclude_rejected: excludeRejected,
      include_drafts: includeDrafts,
    })
  }, [appsData, excludeRejected, includeDrafts])

  const stats = useMemo((): Stats | null => {
    if (!includeStats || !statsData?.applicationStats) return null
    return gqlStatsToStats(statsData.applicationStats)
  }, [includeStats, statsData])

  return {
    applications,
    stats,
    pageInfo: appsData?.applicationsPage ?? null,
    loading: appsLoading || (includeStats && statsLoading),
    error: appsError ? appsError.message || t('errors.genericLoad') : null,
    refetch: async () => {
      await refetchApps()
      if (includeStats) await refetchStats()
    },
  }
}
