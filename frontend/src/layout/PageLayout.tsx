import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/patterns/PageHeader'

interface PageLayoutProps {
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  children: ReactNode
  className?: string
  width?: 'md' | 'lg' | 'xl' | 'full'
}

const WIDTH: Record<NonNullable<PageLayoutProps['width']>, string> = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-[1280px]',
  full: 'max-w-none',
}

export function PageLayout({
  title,
  description,
  actions,
  meta,
  children,
  className,
  width = 'xl',
}: PageLayoutProps) {
  return (
    <div className={cn('mx-auto w-full space-y-6 px-1 py-1', WIDTH[width], className)}>
      <PageHeader title={title} description={description} actions={actions} meta={meta} />
      {children}
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex min-h-[12rem] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  )
}
