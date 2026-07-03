import type { Application } from '@/types'

export type SourceFilter = 'all' | 'offerte_live' | 'manual'
export type QuickFilter = 'all' | 'active' | 'follow_up' | 'interview' | 'offer' | 'archived'

const INTERVIEW_STATUSES = new Set(['phone_screen', 'technical_interview', 'final_interview'])
const ARCHIVED_STATUSES = new Set(['rejected', 'ghosted', 'withdrawn'])
const OFFER_STATUSES = new Set(['offer', 'accepted'])

export const QUICK_FILTER_IDS: QuickFilter[] = [
  'all',
  'active',
  'follow_up',
  'interview',
  'offer',
  'archived',
]

function matchesQuickFilter(app: Application, filter: QuickFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'active':
      return app.status !== 'draft' && !ARCHIVED_STATUSES.has(app.status)
    case 'follow_up':
      if (app.status === 'follow_up_sent') return true
      if (!app.follow_up_date) return false
      return new Date(app.follow_up_date) <= new Date()
    case 'interview':
      return INTERVIEW_STATUSES.has(app.status)
    case 'offer':
      return OFFER_STATUSES.has(app.status)
    case 'archived':
      return ARCHIVED_STATUSES.has(app.status)
    default:
      return true
  }
}

export function countByQuickFilter(applications: Application[], filter: QuickFilter): number {
  return applications.filter((app) => matchesQuickFilter(app, filter)).length
}

export function filterApplications(
  applications: Application[],
  options: {
    sourceFilter: SourceFilter
    quickFilter: QuickFilter
    search: string
  }
): Application[] {
  let apps = applications

  if (options.sourceFilter === 'offerte_live') {
    apps = apps.filter((app) => app.application_source === 'offerte_live')
  } else if (options.sourceFilter === 'manual') {
    apps = apps.filter((app) => app.application_source === 'manual')
  }

  if (options.quickFilter !== 'all') {
    apps = apps.filter((app) => matchesQuickFilter(app, options.quickFilter))
  }

  const query = options.search.trim().toLowerCase()
  if (query) {
    apps = apps.filter((app) => {
      const haystack = [app.company_name, app.job_title, app.location, app.ta_name].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }

  return apps
}

export const HIDE_REJECTED_KEY = 'hideRejected'

export function readHideRejectedPreference(): boolean {
  const stored = localStorage.getItem(HIDE_REJECTED_KEY)
  return stored === null ? true : stored === 'true'
}
