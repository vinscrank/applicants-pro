import { sourceLabel, statusLabel } from '../i18n/labels'
import type { ApplicationSourceType, StatusType } from '../types'

export interface ApplicationTrackerMatch {
  application_id: number
  company_name: string
  job_title: string
  status: string
  last_applied_at: string | null
  application_source: string
}

export function formatTrackerMatchDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function trackerMatchStatusLabel(status: string): string {
  return statusLabel(status as StatusType) || status
}

export function trackerMatchSourceLabel(source: string): string {
  return sourceLabel(source as ApplicationSourceType) || source
}

export function trackerMatchSummary(match: ApplicationTrackerMatch): string {
  const date = formatTrackerMatchDate(match.last_applied_at)
  const status = trackerMatchStatusLabel(match.status)
  const source = trackerMatchSourceLabel(match.application_source)
  const parts = [`${match.company_name} · ${match.job_title}`, `Stato: ${status}`, `Fonte: ${source}`]
  if (date) parts.push(`Registrata il ${date}`)
  return parts.join(' · ')
}
