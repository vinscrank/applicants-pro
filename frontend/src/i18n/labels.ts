import i18n from './client'
import type {
  ApplicationMethodType,
  ApplicationSourceType,
  PriorityType,
  RemoteType,
  StatusType,
} from '@/types'
import type { QuickFilter, SourceFilter } from '@/applications/application-filters'
import type { UiStatusKey } from '@/applications/status'

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options)
}

export function statusLabel(status: StatusType): string {
  return i18n.t(`status.${status}`)
}

export function uiStatusLabel(status: UiStatusKey): string {
  return i18n.t(`uiStatus.${status}`)
}

export function priorityLabel(priority: PriorityType): string {
  return i18n.t(`priority.${priority}`)
}

export function remoteLabel(remote: RemoteType): string {
  return i18n.t(`remote.${remote}`)
}

export function sourceLabel(source: ApplicationSourceType): string {
  return i18n.t(`source.${source}`)
}

export function methodLabel(method: ApplicationMethodType): string {
  return i18n.t(`method.${method}`)
}

export function quickFilterLabel(filter: QuickFilter): string {
  return i18n.t(`candidature.filter.${filter}`)
}

export function sourceFilterLabel(filter: SourceFilter): string {
  if (filter === 'all') return i18n.t('candidature.sourceAll')
  if (filter === 'live_jobs') return i18n.t('candidature.sourceLive')
  return i18n.t('candidature.sourceManual')
}

export function kanbanColumnLabel(column: 'draft' | 'applied' | 'interview' | 'offer' | 'closed'): string {
  return i18n.t(`candidature.kanban.${column}`)
}
