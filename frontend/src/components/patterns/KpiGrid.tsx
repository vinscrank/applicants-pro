'use client'

import type { ReactNode } from 'react'
import { Card, Metric, Text } from '@tremor/react'

interface KpiItem {
  title: string
  value: string | number
  delta?: string
  icon?: ReactNode
}

interface KpiGridProps {
  items: KpiItem[]
  columns?: 2 | 3 | 4
}

const COL_CLASS: Record<NonNullable<KpiGridProps['columns']>, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function KpiGrid({ items, columns = 3 }: KpiGridProps) {
  return (
    <div className={`grid gap-4 ${COL_CLASS[columns]}`}>
      {items.map((item) => (
        <Card
          key={item.title}
          className="rounded-xl border border-border bg-card p-5 shadow-sm ring-1 ring-black/[0.02]"
        >
          <div className="flex items-start justify-between gap-2">
            <Text className="text-muted-foreground">{item.title}</Text>
            {item.icon}
          </div>
          <Metric className="mt-2 font-display text-foreground">{item.value}</Metric>
          {item.delta ? <Text className="mt-1 text-xs text-muted-foreground">{item.delta}</Text> : null}
        </Card>
      ))}
    </div>
  )
}
