import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/patterns/EmptyState'

interface PlatformEmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function PlatformEmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
}: PlatformEmptyStateProps) {
  const resolvedAction =
    action ??
    (actionLabel && onAction ? (
      <Button type="button" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null)

  return (
    <EmptyState icon={icon} title={title} description={description} action={resolvedAction} />
  )
}
