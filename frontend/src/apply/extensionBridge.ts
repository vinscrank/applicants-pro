import { publicExtensionId } from '@/lib/env'
import { apiUrl, getAccessToken } from '../auth/http'
import type { UserProfile } from '../auth/types'
import { profileToAutofillPayload } from '../auth/types'
import { offerteFetch } from '../offerte/api'
import { markOfferteListRestore, markOfferteDismissRestore } from '../offerte/offerteListSession'
import { publishOfferApplied } from '../offerte/offerteSyncChannel'
import { getApplications, updateApplication } from '@/lib/applications-apollo'

const EXTENSION_ID_KEY = 'candidature_extension_id'
const COMPANION_OFFER_KEY = 'companion_offer'
const COMPANION_APPLY_URL_KEY = 'companion_apply_url'
const COMPANION_CONTEXT_KEY = 'companion_context'
const COMPANION_COMPLETED_KEY = 'companion_completed'
const COMPANION_WINDOW_NAME = 'candidature_companion'

export interface CompanionContext {
  offerId?: string
  company?: string
  role?: string
  applyUrl?: string
  location?: string | null
  source?: string
  label: string
}

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: unknown,
          callback?: (response: unknown) => void,
        ) => void
        lastError?: { message?: string }
      }
    }
  }
}

let companionWindow: Window | null = null

export function getExtensionId(): string {
  return localStorage.getItem(EXTENSION_ID_KEY) || publicExtensionId()
}

export function isExtensionAvailable(): boolean {
  return Boolean(getExtensionId() && window.chrome?.runtime?.sendMessage)
}

function sendExtensionMessage(message: unknown): Promise<{ ok: boolean; filled: number; message: string }> {
  return new Promise((resolve) => {
    const extensionId = getExtensionId()
    if (!extensionId || !window.chrome?.runtime?.sendMessage) {
      resolve({
        ok: false,
        filled: 0,
        message: 'Estensione non configurata. Imposta l\'Extension ID nel profilo.',
      })
      return
    }
    window.chrome.runtime.sendMessage(extensionId, message, (response) => {
      const err = window.chrome?.runtime?.lastError
      if (err) {
        resolve({ ok: false, filled: 0, message: err.message || 'Estensione non raggiungibile' })
        return
      }
      const data = (response || {}) as { ok?: boolean; filled?: number; message?: string; version?: string }
      let message = data.message || (data.ok ? 'Form compilato' : 'Nessun campo compilato')
      const extVersion = typeof data.version === 'string' ? data.version : ''
      if (extVersion) {
        message = `[ext v${extVersion}] ${message}`
      }
      resolve({
        ok: Boolean(data.ok),
        filled: data.filled || 0,
        message,
      })
    })
  })
}

function writeCompanionStorage(context: CompanionContext): void {
  localStorage.setItem(COMPANION_CONTEXT_KEY, JSON.stringify(context))
  localStorage.setItem(COMPANION_OFFER_KEY, context.label)
  if (context.applyUrl) localStorage.setItem(COMPANION_APPLY_URL_KEY, context.applyUrl)
  else localStorage.removeItem(COMPANION_APPLY_URL_KEY)
  localStorage.removeItem(COMPANION_COMPLETED_KEY)
}

function companionPageUrl(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}#companion`
}

function companionWindowFeatures(): string {
  const width = 440
  const height = Math.min(920, window.screen.availHeight - 48)
  const left = Math.max(0, window.screenX + window.outerWidth - width - 12)
  const top = Math.max(0, window.screenY + 48)
  return [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'scrollbars=yes',
    'resizable=yes',
  ].join(',')
}

export function prepareApplyCompanionContext(context: CompanionContext): void {
  writeCompanionStorage(context)
  registerApplyTarget(context.applyUrl, context.label, {
    company: context.company,
    role: context.role,
    offerId: context.offerId,
    location: context.location,
  })
}

export type OpenCompanionResult = { ok: true } | { ok: false; blocked: true }

export function openApplyCompanionWindow(context: CompanionContext): OpenCompanionResult {
  prepareApplyCompanionContext(context)

  if (companionWindow && !companionWindow.closed) {
    companionWindow.location.href = companionPageUrl()
    companionWindow.focus()
    return { ok: true }
  }

  const opened = window.open(companionPageUrl(), COMPANION_WINDOW_NAME, companionWindowFeatures())
  if (!opened) {
    return { ok: false, blocked: true }
  }

  companionWindow = opened
  opened.focus()
  return { ok: true }
}

function returnToParentAfterCompanion(): void {
  if (window.opener && !window.opener.closed) {
    window.opener.focus()
    window.close()
    return
  }
  window.close()
}

export function readCompanionContext(): CompanionContext | null {
  const raw = localStorage.getItem(COMPANION_CONTEXT_KEY) || sessionStorage.getItem(COMPANION_CONTEXT_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as CompanionContext
    } catch {
      return null
    }
  }
  const label = localStorage.getItem(COMPANION_OFFER_KEY) || sessionStorage.getItem(COMPANION_OFFER_KEY) || ''
  const applyUrl = localStorage.getItem(COMPANION_APPLY_URL_KEY) || sessionStorage.getItem(COMPANION_APPLY_URL_KEY) || ''
  if (!label && !applyUrl) return null
  return { label, applyUrl: applyUrl || undefined }
}

export function isCompanionCompleted(): boolean {
  return localStorage.getItem(COMPANION_COMPLETED_KEY) === '1'
    || sessionStorage.getItem(COMPANION_COMPLETED_KEY) === '1'
}

export function syncExtensionSession(profile: UserProfile | null): void {
  const extensionId = getExtensionId()
  const token = getAccessToken()
  if (!extensionId || !window.chrome?.runtime?.sendMessage || !token) return
  window.chrome.runtime.sendMessage(extensionId, {
    type: 'SYNC_SESSION',
    authToken: token,
    apiUrl: apiUrl(''),
    appUrl: `${window.location.origin}${window.location.pathname}${window.location.search}`,
    profile: profile ? profileToAutofillPayload(profile) : null,
  })
}

export function registerApplyTarget(
  applyUrl?: string,
  offerLabel?: string,
  extras?: { company?: string; role?: string; offerId?: string; location?: string | null },
): void {
  if (!applyUrl) return
  sendExtensionMessage({
    type: 'REGISTER_APPLY',
    apply_url: applyUrl,
    offer_label: offerLabel || '',
    company: extras?.company || '',
    role: extras?.role || '',
    offer_id: extras?.offerId || '',
    location: extras?.location || '',
  })
}

export function requestAutofill(profile: Record<string, string>): Promise<{
  ok: boolean
  filled: number
  message: string
  fieldsFound?: number
  step?: {
    requiredTotal: number
    requiredFilled: number
    requiredMissing: string[]
    hasNext: boolean
    hasSubmit: boolean
    nextLabel?: string
  }
}> {
  return sendExtensionMessage({
    type: 'CANDIDATURE_AUTOFILL',
    profile,
    apply_url: localStorage.getItem(COMPANION_APPLY_URL_KEY) || sessionStorage.getItem(COMPANION_APPLY_URL_KEY) || '',
  })
}

export async function finalizeCompanionApplication(): Promise<void> {
  const ctx = readCompanionContext()
  if (!ctx) {
    throw new Error('Nessuna candidatura in corso')
  }

  if (ctx.offerId && ctx.company && ctx.role && ctx.applyUrl) {
    const trackRes = await offerteFetch<{ application_id: number }>(`/api/offerte/offers/${ctx.offerId}/track`, {
      method: 'POST',
      body: JSON.stringify({
        company: ctx.company,
        role: ctx.role,
        apply_url: ctx.applyUrl,
        location: ctx.location ?? null,
        source: ctx.source ?? '',
        finalize: true,
      }),
    })
    publishOfferApplied({
      offerIds: [ctx.offerId],
      applicationId: trackRes.application_id,
      company: ctx.company,
      role: ctx.role,
      applyUrl: ctx.applyUrl,
      appliedAt: new Date().toISOString(),
    })
    localStorage.setItem(COMPANION_COMPLETED_KEY, '1')
    if (ctx.offerId) markOfferteListRestore(ctx.offerId)
    returnToParentAfterCompanion()
    return
  }

  if (ctx.applyUrl) {
    const apps = await getApplications({ exclude_rejected: false })
    const match = apps.find((a) => (a.job_url || '').trim() === ctx.applyUrl!.trim())
    if (match) {
      await updateApplication(match.id, {
        status: 'applied',
        last_applied_at: new Date().toISOString(),
      })
      localStorage.setItem(COMPANION_COMPLETED_KEY, '1')
      returnToParentAfterCompanion()
      return
    }
  }

  throw new Error('Candidatura non trovata nel tracker')
}

export async function dismissCompanionOffer(): Promise<void> {
  const ctx = readCompanionContext()
  if (!ctx?.offerId) {
    throw new Error('Offerta non collegata')
  }
  await offerteFetch(`/api/offerte/offers/${encodeURIComponent(ctx.offerId)}/dismissed`, {
    method: 'PUT',
    body: JSON.stringify({
      dismissed: true,
      apply_url: ctx.applyUrl ?? '',
      company: ctx.company ?? '',
      role: ctx.role ?? '',
    }),
  })
  localStorage.removeItem(COMPANION_COMPLETED_KEY)
  markOfferteDismissRestore(ctx.offerId)
  returnToParentAfterCompanion()
}
