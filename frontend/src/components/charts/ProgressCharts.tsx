'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts'
import type { ApplicationMethodType, StatusType } from '@/types'
import { statusLabel, methodLabel } from '@/i18n/labels'
import { ChartContainer, ChartTooltipContent, RechartsPrimitive } from '@/components/ui/chart'

export interface FunnelStep {
  key: string
  label: string
  count: number
  rate: number | null
  color: string
}

export interface WeeklyActivityPoint {
  key: string
  label: string
  count: number
}

interface ProgressChartsProps {
  byStatus: Record<string, number>
  byMethod: Record<string, number>
  funnel: FunnelStep[]
  weeklyActivity: WeeklyActivityPoint[]
  total: number
}

const METHOD_COLORS = ['#1a1f36', '#2d5a7b', '#2d7d5f', '#c4873a', '#64748b', '#b54a4a']

export function ProgressCharts({ byStatus, byMethod, funnel, weeklyActivity, total }: ProgressChartsProps) {
  const { t } = useTranslation()

  const statusData = useMemo(
    () =>
      (Object.entries(byStatus) as [string, number][])
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => ({
          key: status,
          label: statusLabel(status as StatusType),
          count,
        })),
    [byStatus],
  )

  const methodData = useMemo(
    () =>
      Object.entries(byMethod)
        .sort((a, b) => b[1] - a[1])
        .map(([method, count]) => ({
          key: method,
          label: methodLabel(method as ApplicationMethodType),
          count,
        })),
    [byMethod],
  )

  const safeFunnel = funnel ?? []
  const maxStatusCount = statusData[0]?.count ?? 1
  const maxFunnelCount = safeFunnel[0]?.count ?? 1

  const activityChartConfig = useMemo(
    () => ({
      count: { label: t('progress.weeklyActivity'), color: '#2d5a7b' },
    }),
    [t],
  )

  const methodChartConfig = useMemo(
    () =>
      Object.fromEntries(
        methodData.map((item, index) => [
          item.key,
          { label: item.label, color: METHOD_COLORS[index % METHOD_COLORS.length] },
        ]),
      ),
    [methodData],
  )

  const activityMax = Math.max(1, ...weeklyActivity.map((point) => point.count))

  return (
    <>
      <div className="progress-charts-grid">
        <section className="apps-content-panel">
          <div className="apps-panel-header">
            <div>
              <h2 className="apps-panel-title">{t('progress.weeklyActivity')}</h2>
              <p className="apps-hero-description">{t('progress.weeklyActivityHint')}</p>
            </div>
          </div>
          <ChartContainer config={activityChartConfig} className="h-[220px] w-full">
            <BarChart data={weeklyActivity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide domain={[0, activityMax]} />
              <RechartsPrimitive.Tooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="count" fill="#2d5a7b" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
        </section>

        <section className="apps-content-panel">
          <div className="apps-panel-header">
            <div>
              <h2 className="apps-panel-title">{t('progress.funnelTitle')}</h2>
              <p className="apps-hero-description">{t('progress.funnelHint')}</p>
            </div>
          </div>
          <div className="progress-funnel-stack">
            {safeFunnel.map((step) => (
              <div key={step.key} className="progress-funnel-row">
                <div className="progress-funnel-label-wrap">
                  <p className="progress-funnel-label">{step.label}</p>
                  {step.rate !== null ? (
                    <p className="progress-funnel-rate">{t('progress.funnelRate', { rate: step.rate })}</p>
                  ) : null}
                </div>
                <span className="progress-funnel-count">{step.count}</span>
                <div className="progress-funnel-bar-track">
                  <div
                    className="progress-funnel-bar-fill"
                    style={{
                      width: `${maxFunnelCount > 0 ? (step.count / maxFunnelCount) * 100 : 0}%`,
                      background: step.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="progress-charts-grid">
        <section className="apps-content-panel">
          <div className="apps-panel-header">
            <h2 className="apps-panel-title">{t('progress.pipelineBreakdown')}</h2>
          </div>
          <div className="progress-status-stack">
            {statusData.map((item) => (
              <div key={item.key} className="progress-status-row">
                <span className="progress-status-label">{item.label}</span>
                <div className="progress-status-bar">
                  <div
                    className="progress-status-bar-fill"
                    style={{ width: `${(item.count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="progress-status-count">{item.count}</span>
              </div>
            ))}
          </div>
          <p className="progress-chart-footnote">
            {t('common.total')}: {total}
          </p>
        </section>

        <section className="apps-content-panel">
          <div className="apps-panel-header">
            <h2 className="apps-panel-title">{t('analytics.byChannel')}</h2>
          </div>
          {methodData.length === 0 ? (
            <p className="apps-empty-description">{t('common.noData')}</p>
          ) : (
            <>
              <ChartContainer config={methodChartConfig} className="h-[240px] w-full">
                <BarChart data={methodData} layout="vertical" margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <RechartsPrimitive.Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4}>
                    {methodData.map((entry, index) => (
                      <Cell key={entry.key} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <p className="progress-chart-footnote">{t('progress.channelFootnote')}</p>
            </>
          )}
        </section>
      </div>
    </>
  )
}
