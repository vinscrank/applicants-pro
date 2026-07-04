import type { PostedWithin, MinStatus, SortBy } from './types'

export const POSTED_OPTIONS: { value: PostedWithin; label: string }[] = [
  { value: 'any', label: 'Qualsiasi data' },
  { value: '24h', label: 'Ultime 24 ore' },
  { value: '7d', label: 'Ultima settimana' },
  { value: '30d', label: 'Ultimo mese' },
  { value: '90d', label: 'Ultimi 3 mesi' },
]

export const STATUS_OPTIONS: { value: MinStatus; label: string }[] = [
  { value: 'all', label: 'Tutte' },
  { value: 'verified_maybe', label: 'Verificate e da controllare' },
  { value: 'verified', label: 'Solo verificate' },
]

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'posted_desc', label: 'Più recenti' },
  { value: 'posted_asc', label: 'Più vecchie' },
  { value: 'relevance', label: 'Pertinenza' },
]

export const POSTED_SHORT: Record<PostedWithin, string> = {
  any: 'Tutte le date',
  '24h': '24 ore',
  '7d': '7 giorni',
  '30d': '30 giorni',
  '90d': '90 giorni',
}
