import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { ClipboardCheck, ExternalLink, FileSearch, RotateCcw, X } from 'lucide-react'
import type { JobOffer, Seniority } from '../types'
import {
  isCompletedApplication,
  isPastApplication,
} from '../offerApplicationStatus'
import { OfferOriginIcon } from './OfferOriginIcon'
import { ProfileFitFeedback } from './ProfileFitFeedback'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type OffersTableMeta = {
  highlightOfferId?: string | null
  showDismissed: boolean
  seniorityLabels: Record<Seniority, string>
  formatDate: (dateStr: string | null) => string
  onApply: (offer: JobOffer) => void
  onMarkApplied: (offer: JobOffer) => void
  onReopenApply: (offer: JobOffer) => void
  onDismiss: (offer: JobOffer) => void
  onAnalyze?: (offer: JobOffer) => void
  onRestore: (offer: JobOffer) => void
  onViewInTracker?: (applicationId: number) => void
}

export function getOffersColumns(t: TFunction): ColumnDef<JobOffer>[] {
  return [
    {
      id: 'offer',
      header: t('jobs.table.offer'),
      cell: ({ row, table }) => {
        const offer = row.original
        const meta = table.options.meta as OffersTableMeta
        const justApplied = meta.highlightOfferId === offer.id
        return (
          <div className="space-y-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <OfferOriginIcon offer={offer} compact />
              <span className="font-medium truncate" title={offer.role}>
                {offer.role}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate" title={offer.company}>
                {offer.company}
              </span>
              {justApplied ? (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                  {t('jobs.completedNow')}
                </span>
              ) : null}
              {offer.historical && !justApplied ? (
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">
                  {t('jobs.historical')}
                </span>
              ) : null}
            </div>
            <ProfileFitFeedback offer={offer} />
          </div>
        )
      },
    },
    {
      id: 'details',
      header: t('jobs.table.details'),
      cell: ({ row, table }) => {
        const offer = row.original
        const meta = table.options.meta as OffersTableMeta
        const seniorityLabel = meta.seniorityLabels[offer.seniority]
        const dateLabel = meta.formatDate(offer.posted_at)
        const notAvailable = t('common.notAvailable')
        return (
          <div className="text-sm">
            <div className="text-muted-foreground truncate">{offer.location || t('jobs.locationUnknown')}</div>
            <div className="text-muted-foreground">
              {dateLabel}
              {seniorityLabel !== notAvailable ? ` · ${seniorityLabel}` : ''}
            </div>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: t('jobs.table.actions'),
      cell: ({ row, table }) => {
        const offer = row.original
        const meta = table.options.meta as OffersTableMeta
        const completed = isCompletedApplication(offer)
        const showDismissed = meta.showDismissed

        if (showDismissed && offer.user_dismissed) {
          return (
            <Button type="button" variant="outline" size="sm" onClick={() => meta.onRestore(offer)}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t('jobs.actions.restore')}
            </Button>
          )
        }

        if (showDismissed || offer.user_dismissed) return null

        return (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => (completed ? meta.onReopenApply(offer) : meta.onApply(offer))}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('jobs.actions.open')}
            </Button>
            {completed && offer.application_id && meta.onViewInTracker ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => meta.onViewInTracker!(offer.application_id!)}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                {t('jobs.actions.tracker')}
              </Button>
            ) : !completed ? (
              <Button type="button" size="sm" onClick={() => meta.onMarkApplied(offer)}>
                <ClipboardCheck className="h-3.5 w-3.5" />
                {t('jobs.actions.applyAndTrack')}
              </Button>
            ) : null}
            {meta.onAnalyze ? (
              <Button type="button" variant="outline" size="sm" onClick={() => meta.onAnalyze!(offer)}>
                <FileSearch className="h-3.5 w-3.5" />
                {t('jobs.actions.analyze')}
              </Button>
            ) : null}
            {!completed ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => meta.onDismiss(offer)}>
                <X className="h-3.5 w-3.5" />
                {t('jobs.actions.dismiss')}
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]
}

export function offerRowClassName(offer: JobOffer, highlightOfferId?: string | null): string {
  const completed = isCompletedApplication(offer)
  const pastApplication = isPastApplication(offer, highlightOfferId)
  const justApplied = highlightOfferId === offer.id
  return cn(
    completed && 'bg-muted/40',
    pastApplication && 'opacity-80',
    offer.user_dismissed && 'opacity-60',
    justApplied && 'ring-2 ring-primary/30',
    offer.historical && 'border-l-2 border-l-muted-foreground/30',
  )
}
