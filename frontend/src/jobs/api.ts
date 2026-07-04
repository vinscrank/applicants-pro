import { authFetch, authFetchRaw, apiUrl } from '../auth/http'

export function jobsUrl(path: string): string {
  return apiUrl(path)
}

export function jobsFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return authFetch<T>(path, options)
}

export async function jobsFetchHtml(path: string): Promise<string> {
  const response = await authFetchRaw(path, { headers: { Accept: 'text/html' } })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
