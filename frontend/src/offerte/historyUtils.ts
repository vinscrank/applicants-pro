import type { SearchSummary } from './types'

export interface HistoryCategory {
  key: string
  label: string
  visits: SearchSummary[]
  lastVisitedAt: string
}

function normalizePrompt(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function historyCategoryKey(entry: SearchSummary): string {
  const prompt = normalizePrompt(entry.prompt_text)
  if (prompt) return `prompt:${prompt}`
  const locations = entry.locations.map((l) => l.trim().toLowerCase()).filter(Boolean).slice(0, 3).join('|')
  const roles = entry.allowed_roles.map((r) => r.trim().toLowerCase()).filter(Boolean).slice(0, 3).join('|')
  if (locations || roles) return `filters:${locations}:${roles}`
  return 'filters:generic'
}

export function historyCategoryLabel(entry: SearchSummary): string {
  const prompt = entry.prompt_text.trim()
  if (prompt) return prompt
  const parts: string[] = []
  if (entry.locations.length) parts.push(entry.locations.slice(0, 2).join(', '))
  if (entry.allowed_roles.length) parts.push(entry.allowed_roles.slice(0, 2).join(', '))
  return parts.join(' · ') || 'Ricerca senza prompt'
}

export function groupHistoryByCategory(history: SearchSummary[]): HistoryCategory[] {
  const groups = new Map<string, SearchSummary[]>()

  for (const entry of history) {
    const key = historyCategoryKey(entry)
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else groups.set(key, [entry])
  }

  return Array.from(groups.entries())
    .map(([key, visits]) => {
      const sorted = [...visits].sort(
        (a, b) => new Date(b.searched_at).getTime() - new Date(a.searched_at).getTime(),
      )
      return {
        key,
        label: historyCategoryLabel(sorted[0]),
        visits: sorted,
        lastVisitedAt: sorted[0].searched_at,
      }
    })
    .sort((a, b) => new Date(b.lastVisitedAt).getTime() - new Date(a.lastVisitedAt).getTime())
}

export function formatHistoryDateShort(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
