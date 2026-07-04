import type { RecentCareersOfferRow } from '@/jobs/types'
import { careersOfferRowKey } from '@/careers-recent/trackCareersOffer'
import { isStrongProfileFit } from '@/jobs/profileFit'

const SNAPSHOT_KEY = 'careers_scan_snapshot_v1'
const ALERT_COUNT_KEY = 'careers_new_matches_count_v1'

function readSnapshot(): Set<string> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeSnapshot(keys: Set<string>): void {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify([...keys]))
}

export function saveCareersScanSnapshot(offers: RecentCareersOfferRow[]): void {
  const previous = readSnapshot()
  const currentKeys = new Set(offers.map(careersOfferRowKey))
  if (previous.size === 0) {
    writeSnapshot(currentKeys)
    localStorage.setItem(ALERT_COUNT_KEY, '0')
    return
  }
  let newStrong = 0
  for (const offer of offers) {
    const key = careersOfferRowKey(offer)
    if (!previous.has(key) && isStrongProfileFit(offer)) {
      newStrong++
    }
  }
  writeSnapshot(currentKeys)
  localStorage.setItem(ALERT_COUNT_KEY, String(newStrong))
  window.dispatchEvent(new CustomEvent('careers-match-alert'))
}

export function readNewCareersMatchCount(): number {
  try {
    return Number.parseInt(localStorage.getItem(ALERT_COUNT_KEY) || '0', 10) || 0
  } catch {
    return 0
  }
}

export function clearNewCareersMatchCount(): void {
  localStorage.setItem(ALERT_COUNT_KEY, '0')
}

export function detectNewCareersMatches(offers: RecentCareersOfferRow[]): number {
  const previous = readSnapshot()
  if (!previous.size) return 0
  return offers.filter((offer) => {
    const key = careersOfferRowKey(offer)
    return !previous.has(key) && isStrongProfileFit(offer)
  }).length
}
