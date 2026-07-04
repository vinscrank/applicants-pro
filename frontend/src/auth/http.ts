import { publicApiUrl, publicBackendUrl } from '@/lib/env'

const TOKEN_KEY = 'accessToken'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function browserApiBase(): string {
  const api = publicApiUrl()
  if (api) return api
  if (typeof window !== 'undefined') return window.location.origin
  return publicBackendUrl()
}

export function backendApiBase(): string {
  return publicBackendUrl()
}

function requestTimeoutMs(path: string, method?: string): number {
  if (path.includes('/api/jobs/search/parse')) return 60_000
  if (path.includes('/api/jobs/search') && method === 'POST') return 300_000
  if (path.includes('/api/jobs/analyze-url')) return 90_000
  if (path.includes('/api/jobs/page-embed')) return 45_000
  if (path.includes('/api/jobs/companies/auto-discover')) return 120_000
  if (path.includes('/api/jobs/companies/scan-all-recent')) return 600_000
  if (path.includes('/api/jobs/companies/scan-all-search')) return 900_000
  return 30_000
}

function formatApiErrorDetail(body: unknown, status?: number): string {
  if (!body || typeof body !== 'object') {
    if (status === 401) return 'Invalid credentials'
    if (status === 400) return 'Invalid email or password (min 8 characters)'
    if (status === 409) return 'Email already registered'
    return 'Request failed'
  }
  const record = body as Record<string, unknown>
  if (typeof record.message === 'string' && record.message.trim()) return record.message
  if (typeof record.detail === 'string' && record.detail.trim()) return record.detail
  if (Array.isArray(record.detail)) {
    const parts = record.detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) {
          const msg = (item as { msg?: unknown }).msg
          return typeof msg === 'string' ? msg : null
        }
        return null
      })
      .filter(Boolean)
    if (parts.length) return parts.join('. ')
  }
  const springError = typeof record.error === 'string' ? record.error : ''
  if (status === 401 || springError === 'Unauthorized') return 'Invalid credentials'
  if (status === 400 || springError === 'Bad Request') {
    return 'Invalid email or password (min 8 characters)'
  }
  if (status === 409 || springError === 'Conflict') return 'Email already registered'
  if (springError) return springError
  return 'Request failed'
}

export async function authFetchRaw(path: string, options?: RequestInit): Promise<Response> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeoutMs = requestTimeoutMs(path, options?.method)
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${browserApiBase()}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    return response
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw new Error('Backend unreachable. Check that Docker is running.')
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  }
  const response = await authFetchRaw(path, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    if (error) {
      throw new Error(formatApiErrorDetail(error, response.status))
    }
    throw new Error(`Server error (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

export function apiUrl(path: string): string {
  return `${backendApiBase()}${path}`
}
