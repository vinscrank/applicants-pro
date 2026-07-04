'use client'

import { useQuery } from '@apollo/client/react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { watchFetchPolicy } from '@/graphql/policies'
import { GET_APPLICATION_TASKS, type GqlTaskScope } from '@/graphql/queries'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'

export type TaskScope = 'today' | 'week' | 'overdue'

export type ApplicationTask = {
  id: string
  application_id: number
  kind: 'follow_up' | 'interview'
  company_name: string
  job_title: string
  due: string
}

const TASK_SCOPE_TO_GQL: Record<TaskScope, GqlTaskScope> = {
  today: 'TODAY',
  week: 'WEEK',
  overdue: 'OVERDUE',
}

export function useApplicationTasks(scope: TaskScope) {
  const { t } = useTranslation()
  const quickAdd = useQuickAddOptional()

  const { data, loading, error, refetch } = useQuery(GET_APPLICATION_TASKS, {
    variables: { scope: TASK_SCOPE_TO_GQL[scope] },
    fetchPolicy: watchFetchPolicy.list,
  })

  useEffect(() => {
    if (!quickAdd?.refreshKey) return
    void refetch()
  }, [quickAdd?.refreshKey, refetch])

  const tasks = useMemo((): ApplicationTask[] => {
    return (data?.applicationTasks ?? []).map((row) => ({
      id: row.id,
      application_id: Number(row.applicationId),
      kind: row.kind as ApplicationTask['kind'],
      company_name: row.companyName,
      job_title: row.jobTitle,
      due: row.due,
    }))
  }, [data])

  return {
    tasks,
    loading,
    error: error ? error.message || t('errors.genericLoad') : null,
    refetch,
  }
}
