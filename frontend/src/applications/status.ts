import type { StatusType } from '@/types'

export type UiStatusKey = 'saved' | 'applied' | 'waiting' | 'follow_up' | 'interview' | 'offer' | 'closed'

export const UI_STATUS_CONFIG: Record<UiStatusKey, { labelKey: `uiStatus.${UiStatusKey}`; className: string }> = {
  saved: { labelKey: 'uiStatus.saved', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  applied: { labelKey: 'uiStatus.applied', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  waiting: { labelKey: 'uiStatus.waiting', className: 'bg-sky-100 text-sky-800 border-sky-200' },
  follow_up: { labelKey: 'uiStatus.follow_up', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  interview: { labelKey: 'uiStatus.interview', className: 'bg-violet-100 text-violet-800 border-violet-200' },
  offer: { labelKey: 'uiStatus.offer', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  closed: { labelKey: 'uiStatus.closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export function mapDbStatusToUi(status: StatusType): UiStatusKey {
  switch (status) {
    case 'draft':
      return 'saved'
    case 'applied':
      return 'applied'
    case 'follow_up_sent':
      return 'follow_up'
    case 'phone_screen':
    case 'technical_interview':
    case 'final_interview':
      return 'interview'
    case 'offer':
    case 'accepted':
      return 'offer'
    default:
      return 'closed'
  }
}

export function mapUiStatusToDb(status: UiStatusKey): StatusType {
  switch (status) {
    case 'saved':
      return 'draft'
    case 'applied':
    case 'waiting':
      return 'applied'
    case 'follow_up':
      return 'follow_up_sent'
    case 'interview':
      return 'phone_screen'
    case 'offer':
      return 'offer'
    case 'closed':
      return 'rejected'
    default:
      return 'applied'
  }
}
