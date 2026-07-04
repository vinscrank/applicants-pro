import { BarChart3, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplicationsQuery } from '@/hooks/useApplicationsQuery'
import { PageLoading } from '@/layout/PageLayout'
import { ProgressCharts } from '@/components/charts/ProgressCharts'
import { Button } from '@/components/ui/button'
import { DAILY_APPLICATION_GOAL } from '@/constants'
import { navigate } from '@/router'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'
import '@/applications/applications-page.css'
import './progress-page.css'

const APPLIED_STATUSES = new Set(['applied', 'follow_up_sent'])
const WEEKLY_GOAL = DAILY_APPLICATION_GOAL * 5
const MIN_APPLICATIONS = 5

export function ProgressView() {
  const { t, i18n } = useTranslation()
  const quickAdd = useQuickAddOptional()
  const { applications, stats, loading } = useApplicationsQuery({ includeStats: true })

  const appliedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return applications.filter((a) => {
      const d = a.last_applied_at || a.created_at
      return APPLIED_STATUSES.has(a.status) && new Date(d).getTime() >= weekAgo
    }).length
  }, [applications])

  const weeklyActivity = useMemo(() => {
    const points = []
    for (let offset = 6; offset >= 0; offset -= 1) {
      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - offset)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const count = applications.filter((application) => {
        if (!APPLIED_STATUSES.has(application.status)) return false
        const appliedAt = new Date(application.last_applied_at || application.created_at)
        return appliedAt >= dayStart && appliedAt < dayEnd
      }).length

      points.push({
        key: dayStart.toISOString(),
        label: dayStart.toLocaleDateString(i18n.language, { weekday: 'short' }),
        count,
      })
    }
    return points
  }, [applications, i18n.language])

  if (loading) {
    return (
      <div className="apps-page">
        <header className="apps-hero">
          <div className="apps-hero-copy">
            <h1 className="apps-hero-title">{t('progress.title')}</h1>
          </div>
        </header>
        <PageLoading />
      </div>
    )
  }

  if (!stats || applications.length < MIN_APPLICATIONS) {
    return (
      <div className="apps-page">
        <header className="apps-hero">
          <div className="apps-hero-copy">
            <h1 className="apps-hero-title">{t('progress.title')}</h1>
            <p className="apps-hero-description">{t('progress.pageLead')}</p>
          </div>
          <div className="apps-hero-actions">
            <Button onClick={() => quickAdd?.openQuickAdd()}>
              <Plus className="h-4 w-4" />
              {t('nav.applicationShort')}
            </Button>
          </div>
        </header>
        <section className="apps-content-panel">
          <div className="apps-empty">
            <div className="apps-empty-icon">
              <BarChart3 className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h3 className="apps-empty-title">{t('analytics.insufficientTitle')}</h3>
            <p className="apps-empty-description">{t('analytics.insufficientDescription')}</p>
            <Button className="mt-6" onClick={() => quickAdd?.openQuickAdd()}>
              <Plus className="h-4 w-4" />
              {t('progress.emptyCta')}
            </Button>
          </div>
        </section>
      </div>
    )
  }

  const byStatus = stats.by_status || {}
  const totalApplied = (byStatus.applied || 0) + (byStatus.follow_up_sent || 0)
  const totalInterviews =
    (byStatus.phone_screen || 0) +
    (byStatus.technical_interview || 0) +
    (byStatus.final_interview || 0)
  const totalOffers = byStatus.offer || 0

  const responseRate = totalApplied > 0 ? Math.round((totalInterviews / totalApplied) * 100) : 0
  const interviewToOfferRate = totalInterviews > 0 ? Math.round((totalOffers / totalInterviews) * 100) : 0

  const byMethod: Record<string, number> = {}
  applications.forEach((app) => {
    const method = app.application_method || 'other'
    byMethod[method] = (byMethod[method] || 0) + 1
  })

  const goalMet = appliedThisWeek >= WEEKLY_GOAL
  const goalRemaining = Math.max(0, WEEKLY_GOAL - appliedThisWeek)
  const goalProgress = Math.min(100, (appliedThisWeek / WEEKLY_GOAL) * 100)

  const funnel = [
    {
      key: 'applied',
      label: t('progress.funnelApplied'),
      count: totalApplied,
      rate: null,
      color: '#2d5a7b',
    },
    {
      key: 'interview',
      label: t('progress.funnelInterview'),
      count: totalInterviews,
      rate: responseRate,
      color: '#2d7d5f',
    },
    {
      key: 'offer',
      label: t('progress.funnelOffer'),
      count: totalOffers,
      rate: interviewToOfferRate,
      color: '#c4873a',
    },
  ]

  return (
    <div className="apps-page">
      <header className="apps-hero">
        <div className="apps-hero-copy">
          <h1 className="apps-hero-title">{t('progress.title')}</h1>
          <p className="apps-hero-description">{t('progress.pageLead')}</p>
        </div>
        <div className="apps-hero-actions">
          <Button variant="outline" onClick={() => navigate({ page: 'candidature' })}>
            {t('nav.applications')}
          </Button>
        </div>
      </header>

      <div className="apps-kpi-grid">
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('common.total')}</p>
          <p className="apps-kpi-value">{stats.total}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('analytics.responseRate')}</p>
          <p className="apps-kpi-value">{responseRate}%</p>
          <p className="apps-kpi-hint">{t('progress.responseRateHint')}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('analytics.interviewToOffer')}</p>
          <p className="apps-kpi-value">{interviewToOfferRate}%</p>
          <p className="apps-kpi-hint">{t('progress.interviewOfferHint')}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('analytics.dailyAverage')}</p>
          <p className="apps-kpi-value">{stats.daily_average.toFixed(1)}</p>
          <p className="apps-kpi-hint">{t('progress.dailyAverageHint')}</p>
        </div>
      </div>

      <section className="progress-goal-panel">
        <div className="progress-goal-header">
          <div className="progress-goal-copy">
            <h2 className="progress-goal-title">{t('progress.weeklyGoal')}</h2>
            <p className="progress-goal-hint">{t('progress.weeklyGoalHint')}</p>
          </div>
          <span className={`progress-goal-badge${goalMet ? ' is-met' : ''}`}>
            {goalMet ? t('progress.goalMet') : t('progress.goalRemaining', { count: goalRemaining })}
          </span>
        </div>
        <div className="progress-goal-metrics">
          <span className="progress-goal-current">{appliedThisWeek}</span>
          <span className="progress-goal-target">/ {WEEKLY_GOAL}</span>
        </div>
        <div className="progress-goal-track" aria-hidden>
          <div className="progress-goal-fill" style={{ width: `${goalProgress}%` }} />
        </div>
      </section>

      <ProgressCharts
        byStatus={byStatus}
        byMethod={byMethod}
        funnel={funnel}
        weeklyActivity={weeklyActivity}
        total={stats.total}
      />
    </div>
  )
}
