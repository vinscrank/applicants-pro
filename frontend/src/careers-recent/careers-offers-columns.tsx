import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { ClipboardCheck, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RecentCareersOfferRow } from '@/offerte/types'
import { careersOfferRowKey } from '@/careers-recent/trackCareersOffer'

export type CareersOffersTableMeta = {
  locale: string
  trackedByKey: Record<string, number>
  trackingKey: string | null
  onMarkApplied: (offer: RecentCareersOfferRow) => void
  onOpenApply: (offer: RecentCareersOfferRow) => void
  onOpenTracker: (applicationId: number) => void
  formatPostedAt: (value: string | null | undefined, locale: string) => string
}

export function getCareersOffersColumns(t: TFunction): ColumnDef<RecentCareersOfferRow>[] {
  return [
    {
      accessorKey: 'company_name',
      header: t('careersRecent.colCompany'),
      cell: ({ row }) => <span className="font-medium">{row.original.company_name}</span>,
    },
    {
      accessorKey: 'role',
      header: t('careersRecent.colRole'),
    },
    {
      id: 'posted_at',
      header: t('careersRecent.colPosted'),
      cell: ({ row, table }) => {
        const meta = table.options.meta as CareersOffersTableMeta
        return (
          <span className="whitespace-nowrap text-muted-foreground">
            {meta.formatPostedAt(row.original.posted_at, meta.locale)}
          </span>
        )
      },
    },
    {
      accessorKey: 'location',
      header: t('careersRecent.colLocation'),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{(getValue() as string) || '—'}</span>
      ),
    },
    {
      id: 'actions',
      header: t('careersRecent.colActions'),
      cell: ({ row, table }) => {
        const meta = table.options.meta as CareersOffersTableMeta
        const offer = row.original
        const rowKey = careersOfferRowKey(offer)
        const applicationId = meta.trackedByKey[rowKey]
        const isTracking = meta.trackingKey === rowKey
        return applicationId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => meta.onOpenTracker(applicationId)}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            {t('offerte.actions.tracker')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isTracking || !offer.apply_url}
            onClick={() => meta.onMarkApplied(offer)}
          >
            {isTracking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ClipboardCheck className="h-3.5 w-3.5" />
            )}
            {t('offerte.actions.markApplied')}
          </Button>
        )
      },
    },
    {
      id: 'link',
      header: () => null,
      cell: ({ row, table }) => {
        const meta = table.options.meta as CareersOffersTableMeta
        const offer = row.original
        if (!offer.apply_url) return null
        return (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('common.openJobPosting')}
            onClick={() => meta.onOpenApply(offer)}
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )
      },
    },
  ]
}
