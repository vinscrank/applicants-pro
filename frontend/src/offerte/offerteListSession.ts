import type { SearchCommand, SearchPreferences, SearchResult, JobOffer } from './types'

const USER_ID_KEY = 'candidature_user_id'
const SNAPSHOT_KEY = 'offerte_list_snapshot'
const RESTORE_KEY = 'offerte_restore_list'
const HIGHLIGHT_KEY = 'offerte_highlight_offer_id'
const DISMISS_KEY = 'offerte_dismiss_offer_id'

export const OFFERTE_LIST_STORAGE_KEYS = [RESTORE_KEY, HIGHLIGHT_KEY, DISMISS_KEY, SNAPSHOT_KEY] as const

export interface OfferteListSnapshot {
  result: SearchResult
  command: SearchCommand
  offerPool: JobOffer[]
  sessionFilters: SearchPreferences
  statusFilter: string
}

export function setActiveUserId(userId: number | null): void {
  if (userId == null) {
    localStorage.removeItem(USER_ID_KEY)
    return
  }
  localStorage.setItem(USER_ID_KEY, String(userId))
}

function scopedKey(base: string): string {
  const userId = localStorage.getItem(USER_ID_KEY)
  return userId ? `${base}:${userId}` : base
}

export function clearOfferteListSession(): void {
  for (const key of [...OFFERTE_LIST_STORAGE_KEYS]) {
    localStorage.removeItem(scopedKey(key))
    localStorage.removeItem(key)
  }
}

export function saveOfferteListSnapshot(snapshot: OfferteListSnapshot): void {
  localStorage.setItem(scopedKey(SNAPSHOT_KEY), JSON.stringify(snapshot))
}

export function markOfferteListRestore(highlightOfferId: string): void {
  localStorage.setItem(scopedKey(RESTORE_KEY), '1')
  localStorage.setItem(scopedKey(HIGHLIGHT_KEY), highlightOfferId)
}

export function markOfferteDismissRestore(offerId: string): void {
  localStorage.setItem(scopedKey(RESTORE_KEY), '1')
  localStorage.setItem(scopedKey(DISMISS_KEY), offerId)
}

export function consumeOfferteListRestore(): OfferteListSnapshot | null {
  if (localStorage.getItem(scopedKey(RESTORE_KEY)) !== '1') return null
  localStorage.removeItem(scopedKey(RESTORE_KEY))
  const raw = localStorage.getItem(scopedKey(SNAPSHOT_KEY))
  localStorage.removeItem(scopedKey(SNAPSHOT_KEY))
  if (!raw) return null
  try {
    return JSON.parse(raw) as OfferteListSnapshot
  } catch {
    return null
  }
}

export function consumeHighlightOfferId(): string | null {
  const id = localStorage.getItem(scopedKey(HIGHLIGHT_KEY))
  localStorage.removeItem(scopedKey(HIGHLIGHT_KEY))
  return id || null
}

export function consumeDismissOfferId(): string | null {
  const id = localStorage.getItem(scopedKey(DISMISS_KEY))
  localStorage.removeItem(scopedKey(DISMISS_KEY))
  return id || null
}

export function hasPendingOfferteListRestore(): boolean {
  return localStorage.getItem(scopedKey(RESTORE_KEY)) === '1'
}
