import type { RecentCareersOfferRow } from '@/jobs/types'
import { careersOfferRowKey } from '@/careers-recent/trackCareersOffer'
import { filterCareersOffers } from '@/careers-recent/filterCareersOffers'

export type CareersSmartFilterId = 'untracked' | 'remote' | 'priority' | 'today'

export interface CareersSmartFilterContext {
  trackedByKey: Record<string, number>
  priorityCompanyIds: Set<number>
  dismissedKeys: Set<string>
}

const REMOTE_PATTERN = /remote|remoto|hybrid|ibrid|wfh|work from home|da casa|telelavoro/i

function isPostedToday(value: string | null | undefined): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  )
}

function isRemoteOffer(offer: RecentCareersOfferRow): boolean {
  return REMOTE_PATTERN.test(offer.location || '')
}

export function applyCareersSmartFilters(
  offers: RecentCareersOfferRow[],
  smartFilters: Set<CareersSmartFilterId>,
  roleQuery: string,
  locationQuery: string,
  ctx: CareersSmartFilterContext,
): RecentCareersOfferRow[] {
  let rows = filterCareersOffers(offers, roleQuery, locationQuery)
  if (ctx.dismissedKeys.size) {
    rows = rows.filter((offer) => !ctx.dismissedKeys.has(careersOfferRowKey(offer)))
  }
  if (smartFilters.has('untracked')) {
    rows = rows.filter((offer) => !ctx.trackedByKey[careersOfferRowKey(offer)])
  }
  if (smartFilters.has('remote')) {
    rows = rows.filter(isRemoteOffer)
  }
  if (smartFilters.has('priority')) {
    rows = rows.filter(
      (offer) => offer.company_id != null && ctx.priorityCompanyIds.has(offer.company_id),
    )
  }
  if (smartFilters.has('today')) {
    rows = rows.filter((offer) => isPostedToday(offer.posted_at))
  }
  return rows
}
