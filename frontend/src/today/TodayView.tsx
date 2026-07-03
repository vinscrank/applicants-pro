import { ArrowRight, Calendar, Mail } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '@/router'
import { useAuth } from '@/auth/AuthContext'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'
import { useApplicationsQuery } from '@/hooks/useApplicationsQuery'
import { useApplicationTasks, type TaskScope } from '@/applications/useApplicationTasks'
import { KpiGrid } from '@/components/patterns/KpiGrid'
import { ApplicationStatusBadge } from '@/applications/ApplicationStatusBadge'
import { mapDbStatusToUi } from '@/applications/status'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DAILY_APPLICATION_GOAL } from '@/constants'
import { ListRow } from '@/components/patterns/ListRow'
import { PageLayout, PageLoading } from '@/layout/PageLayout'

const INTERVIEW_STATUSES = new Set(['phone_screen', 'technical_interview', 'final_interview'])
const APPLIED_STATUSES = new Set(['applied', 'follow_up_sent'])

export function TodayView() {
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const { profile } = useAuth()
  const quickAdd = useQuickAddOptional()
  const { applications, stats, loading } = useApplicationsQuery({ includeStats: true })
  const [taskTab, setTaskTab] = useState<TaskScope>('today')
  const { tasks, loading: tasksLoading } = useApplicationTasks(taskTab)

  const getGreeting = (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return t('today.morning')
    if (hour < 18) return t('today.afternoon')
    return t('today.evening')
  }

  const formatRelative = (dateStr: string): string => {
    const date = new Date(dateStr)
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('common.today')
    if (diffDays === 1) return t('common.yesterday')
    return t('common.daysAgo', { count: diffDays })
  }

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const interviewCount = applications.filter((a) => INTERVIEW_STATUSES.has(a.status)).length
  const totalApplied = applications.filter((a) => APPLIED_STATUSES.has(a.status)).length
  const responseRate = totalApplied > 0 ? Math.round((interviewCount / totalApplied) * 100) : 0
  const activeCount = applications.filter(
    (a) => !['rejected', 'ghosted', 'withdrawn', 'accepted', 'draft'].includes(a.status),
  ).length

  const staleCount = useMemo(() => {
    return applications.filter((a) => {
      if (!APPLIED_STATUSES.has(a.status)) return false
      const d = new Date(a.last_applied_at || a.created_at)
      return Date.now() - d.getTime() > 14 * 24 * 60 * 60 * 1000
    }).length
  }, [applications])

  const displayTasks = useMemo(() => {
    const rows = tasks.map((task) => ({
      id: task.id,
      title:
        task.kind === 'interview'
          ? t('activity.interview', { company: task.company_name })
          : t('activity.followUp', { company: task.company_name }),
      subtitle: task.job_title,
      appId: task.application_id,
      kind: task.kind as 'interview' | 'follow_up',
    }))
    if (taskTab === 'today' && staleCount > 0) {
      rows.push({
        id: 'stale',
        title: t('today.staleApplications', { count: staleCount }),
        subtitle: t('today.staleHint'),
        appId: 0,
        kind: 'follow_up' as const,
      })
    }
    return rows
  }, [tasks, taskTab, staleCount, t])

  const recent = [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5)

  const dateLabel = mounted
    ? new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  const greeting = mounted ? getGreeting() : t('today.pageTitle')

  if (loading) {
    return (
      <PageLayout title={t('today.pageTitle')}>
        <PageLoading />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={`${greeting}${firstName ? `, ${firstName}` : ''}`}
      description={
        mounted
          ? t('today.goalDescription', {
              date: dateLabel,
              current: stats?.applied_today ?? 0,
              goal: DAILY_APPLICATION_GOAL,
            })
          : undefined
      }
      actions={
        <>
          <Button variant="outline" onClick={() => navigate({ page: 'discover', tab: 'search' })}>
            {t('nav.searchOffers')}
          </Button>
          <Button onClick={() => quickAdd?.openQuickAdd()}>+ {t('nav.applicationShort')}</Button>
        </>
      }
    >
      <KpiGrid
        columns={3}
        items={[
          { title: t('today.activeApplications'), value: activeCount },
          { title: t('today.interviews'), value: interviewCount },
          { title: t('today.responseRate'), value: `${responseRate}%` },
        ]}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{t('today.actionsTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={taskTab} onValueChange={(v) => setTaskTab(v as TaskScope)} className="mb-4">
            <TabsList>
              <TabsTrigger value="today">{t('today.tasksTabToday')}</TabsTrigger>
              <TabsTrigger value="week">{t('today.tasksTabWeek')}</TabsTrigger>
              <TabsTrigger value="overdue">{t('today.tasksTabOverdue')}</TabsTrigger>
            </TabsList>
          </Tabs>
          {tasksLoading ? (
            <PageLoading />
          ) : displayTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{t('today.noActions')}</p>
          ) : (
            <div className="space-y-2">
              {displayTasks.map((task) => (
                <ListRow
                  key={task.id}
                  icon={
                    task.kind === 'interview' ? (
                      <Calendar className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )
                  }
                  onClick={() => {
                    if (task.id === 'stale') {
                      navigate({ page: 'candidature', quickFilter: 'follow_up' })
                      return
                    }
                    navigate({ page: 'application', applicationId: task.appId })
                  }}
                >
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </ListRow>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('today.recentApplications')}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate({ page: 'candidature' })}>
            {t('common.seeAll')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('today.noApplications')}</p>
          ) : (
            recent.map((app) => (
              <ListRow
                key={app.id}
                onClick={() => navigate({ page: 'application', applicationId: app.id })}
              >
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium truncate">{app.company_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.job_title}</p>
                </div>
                <ApplicationStatusBadge status={mapDbStatusToUi(app.status)} />
                <span className="shrink-0 text-xs text-muted-foreground" suppressHydrationWarning>
                  {mounted ? formatRelative(app.updated_at) : null}
                </span>
              </ListRow>
            ))
          )}
        </CardContent>
      </Card>
    </PageLayout>
  )
}
