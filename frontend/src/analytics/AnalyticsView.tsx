import { BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { statusLabel, methodLabel } from '@/i18n/labels'
import type { ApplicationMethodType, StatusType } from '@/types'
import { useApplicationsQuery } from '@/hooks/useApplicationsQuery'
import { PageLayout, PageLoading } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { KpiCard } from '@/dashboard/KpiCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AnalyticsView() {
  const { t } = useTranslation()
  const { applications, stats, loading } = useApplicationsQuery({ includeStats: true })

  if (loading) {
    return (
      <PageLayout title={t('analytics.title')} description={t('analytics.description')}>
        <PageLoading />
      </PageLayout>
    )
  }

  if (!stats || applications.length < 5) {
    return (
      <PageLayout title={t('analytics.title')} description={t('analytics.description')}>
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

  return (
    <PageLayout title={t('analytics.title')} description={t('analytics.description')}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t('common.total')} value={stats.total} />
        <KpiCard title={t('analytics.responseRate')} value={`${responseRate}%`} />
        <KpiCard title={t('analytics.interviewToOffer')} value={`${interviewToOfferRate}%`} />
        <KpiCard title={t('analytics.dailyAverage')} value={stats.daily_average.toFixed(1)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('analytics.pipelineByStatus')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(byStatus) as [string, number][])
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="platform-stat-bar-row">
                  <span className="truncate text-muted-foreground">
                    {statusLabel(status as StatusType)}
                  </span>
                  <div className="platform-stat-bar-track">
                    <div
                      className="platform-stat-bar-fill"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums font-medium">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('analytics.byChannel')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byMethod)
              .sort((a, b) => b[1] - a[1])
              .map(([method, count]) => (
                <div key={method} className="platform-stat-bar-row">
                  <span className="truncate text-muted-foreground">
                    {methodLabel(method as ApplicationMethodType)}
                  </span>
                  <div className="platform-stat-bar-track">
                    <div
                      className="platform-stat-bar-fill"
                      style={{ width: `${(count / applications.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-right tabular-nums font-medium">{count}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
