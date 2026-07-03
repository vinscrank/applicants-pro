import type { JobOffer } from './types'

const USER_ID_KEY = 'candidature_user_id'
const APPLY_MODAL_KEY = 'offerte_apply_modal_offer'

function scopedKey(base: string): string {
  const userId = localStorage.getItem(USER_ID_KEY)
  return userId ? `${base}:${userId}` : base
}

export function saveApplyModalOffer(offer: JobOffer): void {
  sessionStorage.setItem(scopedKey(APPLY_MODAL_KEY), JSON.stringify(offer))
}

export function readApplyModalOffer(): JobOffer | null {
  const raw = sessionStorage.getItem(scopedKey(APPLY_MODAL_KEY))
  if (!raw) return null
  try {
    return JSON.parse(raw) as JobOffer
  } catch {
    return null
  }
}

export function clearApplyModalOffer(): void {
  sessionStorage.removeItem(scopedKey(APPLY_MODAL_KEY))
}
