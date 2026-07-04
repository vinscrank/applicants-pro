import { ArrowRight, Calendar, Mail, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { navigate } from '@/router'
import { useAuth } from '@/auth/AuthContext'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'
import { useApplicationsQuery } from '@/hooks/useApplicationsQuery'
import { useApplicationTasks, type TaskScope } from '@/hooks/useApplicationTasks'
import { ApplicationStatusBadge } from '@/applications/ApplicationStatusBadge'
import { mapDbStatusToUi } from '@/applications/status'
import { Button } from '@/components/ui/button'
import { DAILY_APPLICATION_GOAL } from '@/constants'
import { PageLoading } from '@/layout/PageLayout'
import { cn } from '@/lib/utils'
import { TopMatchesSection } from '@/today/TopMatchesSection'
import { ProfileReadinessWidget } from '@/profile/ProfileReadinessWidget'
import { loadTopMatches } from '@/discover/topMatchesCache'
import { readNewCareersMatchCount } from '@/careers-recent/careersScanAlerts'
import '@/applications/applications-page.css'

const INTERVIEW_STATUSES = new Set(['phone_screen', 'technical_interview', 'final_interview'])
const APPLIED_STATUSES = new Set(['applied', 'follow_up_sent'])
const TASK_TABS: TaskScope[] = ['today', 'week', 'overdue']
const TASK_TAB_LABEL_KEYS: Record<TaskScope, string> = {
  today: 'today.tasksTabToday',
  week: 'today.tasksTabWeek',
  overdue: 'today.tasksTabOverdue',
}

export function TodayView() {
  const { t, i18n } = useTranslation()
  const [mounted, setMounted] = useState(false)
  const [topMatches, setTopMatches] = useState(() => loadTopMatches(6))
  const [newCareersMatches, setNewCareersMatches] = useState(0)
  useEffect(() => {
    setMounted(true)
    setTopMatches(loadTopMatches(6))
    setNewCareersMatches(readNewCareersMatchCount())
  }, [])
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
    .slice(0, 6)

  const dateLabel = mounted
    ? new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
    : ''

  const greeting = mounted ? getGreeting() : t('today.pageTitle')
  const heroTitle = `${greeting}${firstName ? `, ${firstName}` : ''}`

  if (loading) {
    return (
      <div className="apps-page">
        <header className="apps-hero">
          <div className="apps-hero-copy">
            <h1 className="apps-hero-title">{t('today.pageTitle')}</h1>
          </div>
        </header>
        <PageLoading />
      </div>
    )
  }

  return (
    <div className="apps-page">
      <header className="apps-hero">
        <div className="apps-hero-copy">
          <h1 className="apps-hero-title">{heroTitle}</h1>
          <p className="apps-hero-description">{t('today.pageLead')}</p>
          {mounted ? (
            <p className="apps-hero-description">
              {t('today.goalDescription', {
                date: dateLabel,
                current: stats?.applied_today ?? 0,
                goal: DAILY_APPLICATION_GOAL,
              })}
            </p>
          ) : null}
        </div>
        <div className="apps-hero-actions">
          <Button variant="outline" onClick={() => navigate({ page: 'discover', tab: 'search' })}>
            <Search className="h-4 w-4" />
            {t('nav.searchOffers')}
          </Button>
          <Button onClick={() => quickAdd?.openQuickAdd()}>
            <Plus className="h-4 w-4" />
            {t('nav.applicationShort')}
          </Button>
        </div>
      </header>

      <div className="apps-kpi-grid">
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('today.activeApplications')}</p>
          <p className="apps-kpi-value">{activeCount}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('today.interviews')}</p>
          <p className="apps-kpi-value">{interviewCount}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('today.responseRate')}</p>
          <p className="apps-kpi-value">{responseRate}%</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('candidature.kpiAppliedToday')}</p>
          <p className="apps-kpi-value">{stats?.applied_today ?? 0}</p>
          <p className="apps-kpi-hint">{t('candidature.kpiAppliedTodayHint')}</p>
        </div>
      </div>

      {newCareersMatches > 0 ? (
        <p className="text-sm text-muted-foreground mb-4">
          {t('discover.newMatchesAlert', { count: newCareersMatches })}
        </p>
      ) : null}

      <ProfileReadinessWidget profile={profile} />
      <TopMatchesSection matches={topMatches} />

      <div className="apps-split-panels">
        <section className="apps-content-panel">
          <div className="apps-panel-header">
            <h2 className="apps-panel-title">{t('today.actionsTitle')}</h2>
            <div className="apps-source-tabs" role="tablist" aria-label={t('today.actionsTitle')}>
              {TASK_TABS.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  role="tab"
                  aria-selected={taskTab === scope}
                  className={cn('apps-source-tab', taskTab === scope && 'active')}
                  onClick={() => setTaskTab(scope)}
                >
                  {t(TASK_TAB_LABEL_KEYS[scope])}
                </button>
              ))}
            </div>
          </div>

          {tasksLoading ? (
            <PageLoading />
          ) : displayTasks.length === 0 ? (
            <p className="apps-empty-description">{t('today.noActions')}</p>
          ) : (
            <div className="apps-list-stack">
              {displayTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="platform-list-row"
                  onClick={() => {
                    if (task.id === 'stale') {
                      navigate({ page: 'candidature', quickFilter: 'follow_up' })
                      return
                    }
                    navigate({ page: 'application', applicationId: task.appId })
                  }}
                >
                  <div className="platform-list-row-icon">
                    {task.kind === 'interview' ? (
                      <Calendar className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="apps-content-panel">
          <div className="apps-panel-header">
            <h2 className="apps-panel-title">{t('today.recentApplications')}</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate({ page: 'candidature' })}>
              {t('common.seeAll')}
            </Button>
          </div>

          {recent.length === 0 ? (
            <p className="apps-empty-description">{t('today.noApplications')}</p>
          ) : (
            <div className="apps-list-stack">
              {recent.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className="platform-list-row"
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
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
