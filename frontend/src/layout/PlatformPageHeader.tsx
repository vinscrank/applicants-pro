import type { ReactNode } from 'react'
import { PageHeader } from '@/components/patterns/PageHeader'

interface Props {
  title: string
  subtitle?: string
  compact?: boolean
  meta?: ReactNode
  actions?: ReactNode
}

export function PlatformPageHeader({ title, subtitle, compact = false, meta, actions }: Props) {
  return (
    <PageHeader
      title={title}
      description={subtitle}
      compact={compact}
      meta={meta}
      actions={actions}
      className="rounded-lg border bg-card p-4 sm:p-5"
    />
  )
}
