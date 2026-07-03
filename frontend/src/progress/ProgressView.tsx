import { BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useApplicationsQuery } from '@/hooks/useApplicationsQuery'
import { PageLayout, PageLoading } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { ProgressCharts } from '@/components/charts/ProgressCharts'
import { KpiGrid } from '@/components/patterns/KpiGrid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Metric, Text } from '@tremor/react'
import { DAILY_APPLICATION_GOAL } from '@/constants'

const APPLIED_STATUSES = new Set(['applied', 'follow_up_sent'])
const WEEKLY_GOAL = DAILY_APPLICATION_GOAL * 5

export function ProgressView() {
  const { t } = useTranslation()
  const { applications, stats, loading } = useApplicationsQuery({ includeStats: true })

  const appliedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return applications.filter((a) => {
      const d = a.last_applied_at || a.created_at
      return APPLIED_STATUSES.has(a.status) && new Date(d).getTime() >= weekAgo
    }).length
  }, [applications])

  if (loading) {
    return (
      <PageLayout title={t('progress.title')} description={t('progress.description')}>
        <PageLoading />
      </PageLayout>
    )
  }

  if (!stats || applications.length < 5) {
    return (
      <PageLayout title={t('progress.title')} description={t('progress.description')}>
        <PlatformEmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title={t('analytics.insufficientTitle')}
          description={t('analytics.insufficientDescription')}
        />
      </PageLayout>
    )
  }

  const byStatus = stats.by_status || {}
  const totalApplied = (byStatus['applied'] || 0) + (byStatus['follow_up_sent'] || 0)
  const totalInterviews =
    (byStatus['phone_screen'] || 0) +
    (byStatus['technical_interview'] || 0) +
    (byStatus['final_interview'] || 0)
  const totalOffers = byStatus['offer'] || 0

  const responseRate = totalApplied > 0 ? Math.round((totalInterviews / totalApplied) * 100) : 0
  const interviewToOfferRate =
    totalInterviews > 0 ? Math.round((totalOffers / totalInterviews) * 100) : 0

  const byMethod: Record<string, number> = {}
  applications.forEach((app) => {
    const method = app.application_method || 'other'
    byMethod[method] = (byMethod[method] || 0) + 1
  })

  const goalMet = appliedThisWeek >= WEEKLY_GOAL
  const goalRemaining = Math.max(0, WEEKLY_GOAL - appliedThisWeek)

  return (
    <PageLayout title={t('progress.title')} description={t('progress.description')}>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t('progress.weeklyGoal')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('progress.weeklyGoalHint')}</p>
          </div>
          <Badge variant={goalMet ? 'default' : 'secondary'}>
            {goalMet ? t('progress.goalMet') : t('progress.goalRemaining', { count: goalRemaining })}
          </Badge>
        </CardHeader>
        <CardContent>
          <Metric>{appliedThisWeek}</Metric>
          <Text className="text-muted-foreground">
            / {WEEKLY_GOAL} {t('progress.weeklyGoalHint')}
          </Text>
        </CardContent>
      </Card>

      <KpiGrid
        columns={4}
        items={[
          { title: t('common.total'), value: stats.total },
          { title: t('analytics.responseRate'), value: `${responseRate}%` },
          { title: t('analytics.interviewToOffer'), value: `${interviewToOfferRate}%` },
          { title: t('analytics.dailyAverage'), value: stats.daily_average.toFixed(1) },
        ]}
      />

      <ProgressCharts
        byStatus={byStatus}
        byMethod={byMethod}
        total={stats.total}
        applicationCount={applications.length}
      />
    </PageLayout>
  )
}
