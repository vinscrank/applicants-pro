import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: number | string
  delta?: number
  deltaType?: 'increase' | 'decrease' | 'unchanged'
  highlight?: boolean
}

export function KpiCard({
  title,
  value,
  delta,
  deltaType = 'unchanged',
  highlight = false,
}: KpiCardProps) {
  const card = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        {delta != null && (
          <Badge
            variant="secondary"
            className={cn(
              'mt-2 border-transparent',
              deltaType === 'increase' && 'bg-[var(--success-soft)] text-[var(--success-text)]',
              deltaType === 'decrease' && 'bg-[var(--danger-soft)] text-[var(--danger-text)]',
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta}%
          </Badge>
        )}
      </CardContent>
    </Card>
  )

  if (highlight) {
    return <div className="rounded-xl ring-1 ring-primary/15 shadow-sm">{card}</div>
  }

  return card
}
