const SYNC_DISMISS_KEY_BASE = 'jobs_sync_dismiss'
const SYNC_APPLIED_KEY_BASE = 'jobs_sync_applied'

export interface OfferDismissSyncPayload {
  offerIds: string[]
  company: string
  role: string
  applyUrl: string
}

export interface OfferAppliedSyncPayload {
  offerIds: string[]
  applicationId: number
  company: string
  role: string
  applyUrl: string
  appliedAt: string
}

function scopedKey(base: string): string {
  const userId = localStorage.getItem('candidature_user_id')
  return userId ? `${base}:${userId}` : base
}

function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function companyRoleKey(company: string, role: string): [string, string] | null {
  const companyNorm = normalizeMatchText(company)
  const roleNorm = normalizeMatchText(role)
  if (!companyNorm || !roleNorm) return null
  return [companyNorm, roleNorm]
}

function normalizeUrl(value: string): string {
  try {
    const parsed = new URL(value.trim().split('#')[0])
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/$/, '')}`
  } catch {
    return value.trim().toLowerCase().split('#')[0].replace(/\/$/, '')
  }
}

function offerMatchesSyncTarget(
  offer: { id: string; company: string; role: string; apply_url: string },
  payload: { offerIds: string[]; company: string; role: string; applyUrl: string },
): boolean {
  if (payload.offerIds.includes(offer.id)) return true
  const url = normalizeUrl(offer.apply_url || '')
  const targetUrl = normalizeUrl(payload.applyUrl || '')
  if (url && targetUrl && url === targetUrl) return true
  const offerKey = companyRoleKey(offer.company, offer.role)
  const targetKey = companyRoleKey(payload.company, payload.role)
  if (!offerKey || !targetKey) return false
  return offerKey[0] === targetKey[0] && offerKey[1] === targetKey[1]
}

export function offerMatchesDismissSync(
  offer: { id: string; company: string; role: string; apply_url: string },
  payload: OfferDismissSyncPayload,
): boolean {
  return offerMatchesSyncTarget(offer, payload)
}

export function offerMatchesAppliedSync(
  offer: { id: string; company: string; role: string; apply_url: string },
  payload: OfferAppliedSyncPayload,
): boolean {
  return offerMatchesSyncTarget(offer, payload)
}

export function publishOfferDismissed(payload: OfferDismissSyncPayload): void {
  localStorage.setItem(scopedKey(SYNC_DISMISS_KEY_BASE), JSON.stringify({ ...payload, ts: Date.now() }))
}

export function publishOfferApplied(payload: OfferAppliedSyncPayload): void {
  localStorage.setItem(scopedKey(SYNC_APPLIED_KEY_BASE), JSON.stringify({ ...payload, ts: Date.now() }))
}

export function subscribeOfferDismissed(onDismiss: (payload: OfferDismissSyncPayload) => void): () => void {
  const key = scopedKey(SYNC_DISMISS_KEY_BASE)
  const handler = (event: StorageEvent) => {
    if (event.key !== key || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue) as OfferDismissSyncPayload
      onDismiss(parsed)
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function subscribeOfferApplied(onApplied: (payload: OfferAppliedSyncPayload) => void): () => void {
  const key = scopedKey(SYNC_APPLIED_KEY_BASE)
  const handler = (event: StorageEvent) => {
    if (event.key !== key || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue) as OfferAppliedSyncPayload
      onApplied(parsed)
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
