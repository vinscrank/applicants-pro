'use client'

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import type { ApplicationMethodType, StatusType } from '@/types'
import { statusLabel, methodLabel } from '@/i18n/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent, RechartsPrimitive } from '@/components/ui/chart'

interface ProgressChartsProps {
  byStatus: Record<string, number>
  byMethod: Record<string, number>
  total: number
  applicationCount: number
}

const STATUS_COLORS = ['#2d5a7b', '#2d7d5f', '#c4873a', '#64748b', '#b54a4a', '#8b5cf6', '#0ea5e9']
const METHOD_COLORS = ['#1a1f36', '#2d5a7b', '#2d7d5f', '#c4873a', '#64748b', '#b54a4a']

export function ProgressCharts({ byStatus, byMethod, total, applicationCount }: ProgressChartsProps) {
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

  const statusChartConfig = useMemo(
    () =>
      Object.fromEntries(
        statusData.map((item, index) => [
          item.key,
          { label: item.label, color: STATUS_COLORS[index % STATUS_COLORS.length] },
        ]),
      ),
    [statusData],
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

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('analytics.pipelineByStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[280px]">
            <PieChart>
              <RechartsPrimitive.Tooltip content={<ChartTooltipContent hideLabel />} />
              <Pie data={statusData} dataKey="count" nameKey="key" innerRadius={60} outerRadius={90}>
                {statusData.map((entry, index) => (
                  <Cell key={entry.key} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('analytics.byChannel')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={methodChartConfig} className="h-[280px] w-full">
            <BarChart data={methodData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12 }} />
              <RechartsPrimitive.Tooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                {methodData.map((entry, index) => (
                  <Cell key={entry.key} fill={METHOD_COLORS[index % METHOD_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('common.total')}: {applicationCount} · {t('analytics.pipelineByStatus')}: {total}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
