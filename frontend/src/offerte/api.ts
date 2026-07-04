import { authFetch, authFetchRaw, apiUrl } from '../auth/http'

export function offerteUrl(path: string): string {
  return apiUrl(path)
}

export function offerteFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return authFetch<T>(path, options)
}

export async function offerteFetchHtml(path: string): Promise<string> {
  const response = await authFetchRaw(path, { headers: { Accept: 'text/html' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
