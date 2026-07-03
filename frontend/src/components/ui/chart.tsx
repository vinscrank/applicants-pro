'use client'

import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
  }
>

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke="#ccc"]]:stroke-border/50 flex aspect-video justify-center text-xs [&_.recharts-dot[stroke="#fff"]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none',
          className,
        )}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: { fill?: string } }>
  label?: string
  hideLabel?: boolean
}) {
  const { config } = useChart()
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {!hideLabel && label ? <p className="mb-1 font-medium">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const key = item.name || `item-${index}`
          const itemConfig = config[key]
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: item.color || item.payload?.fill || itemConfig?.color }}
              />
              <span className="text-muted-foreground">{itemConfig?.label || key}</span>
              <span className="ml-auto font-medium tabular-nums">{item.value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export {
  RechartsPrimitive as Recharts,
  RechartsPrimitive,
}
