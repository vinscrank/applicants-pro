import { useCallback, useEffect, useState } from 'react'
import { api, type ApplicationTask } from '@/api'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'

export type TaskScope = 'today' | 'week' | 'overdue'

export function useApplicationTasks(scope: TaskScope) {
  const quickAdd = useQuickAddOptional()
  const [tasks, setTasks] = useState<ApplicationTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTasks(scope)
      setTasks(data)
    } catch (e) {
      setTasks([])
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [scope])

  useEffect(() => {
    load()
  }, [load, quickAdd?.refreshKey])

  return { tasks, loading, error, reload: load }
}
