"use client";

import { useQuery } from "@apollo/client/react";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GET_APPLICATIONS, GET_APPLICATION_STATS } from "@/graphql/queries";
import {
  filterApplicationsList,
  gqlStatsToStats,
  gqlToApplication,
} from "@/lib/application-mapper";
import type { Application, Stats } from "@/types";
import { useQuickAddOptional } from "@/contexts/QuickAddContext";

export interface UseApplicationsQueryOptions {
  excludeRejected?: boolean;
  includeDrafts?: boolean;
  includeStats?: boolean;
  enabled?: boolean;
}

export function useApplicationsQuery(
  options: UseApplicationsQueryOptions = {},
) {
  const {
    excludeRejected = false,
    includeDrafts = false,
    includeStats = false,
    enabled = true,
  } = options;
  const { t } = useTranslation();
  const quickAdd = useQuickAddOptional();

  const {
    data: appsData,
    loading: appsLoading,
    error: appsError,
    refetch: refetchApps,
  } = useQuery(GET_APPLICATIONS, {
    skip: !enabled,
    fetchPolicy: "cache-and-network",
  });

  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useQuery(GET_APPLICATION_STATS, {
    skip: !enabled || !includeStats,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    if (!enabled || !quickAdd?.refreshKey) return
    void refetchApps()
    if (includeStats) void refetchStats()
  }, [enabled, includeStats, quickAdd?.refreshKey, refetchApps, refetchStats])

  const applications = useMemo((): Application[] => {
    const rows = (appsData?.applications ?? []).map(gqlToApplication);
    return filterApplicationsList(rows, {
      exclude_rejected: !excludeRejected,
      include_drafts: includeDrafts,
    });
  }, [appsData, excludeRejected, includeDrafts]);

  const stats = useMemo((): Stats | null => {
    if (!includeStats || !statsData?.applicationStats) return null;
    return gqlStatsToStats(statsData.applicationStats);
  }, [includeStats, statsData]);

  const error = appsError
    ? appsError.message || t("errors.genericLoad")
    : null;

  return {
    applications,
    stats,
    loading: appsLoading || (includeStats && statsLoading),
    error,
    refetch: async () => {
      await refetchApps();
      if (includeStats) await refetchStats();
    },
  };
}
