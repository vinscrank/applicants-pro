import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { JobOffer } from '../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  archivedOffer: JobOffer | null
  trackerApplicationId: number | null
  onOpenTracker: (applicationId: number) => void
}

export function ArchivedLiveOfferDialog({
  open,
  onOpenChange,
  archivedOffer,
  trackerApplicationId,
  onOpenTracker,
}: Props) {
  const { t } = useTranslation()
  const isArchived = Boolean(archivedOffer)
  const applicationId = archivedOffer?.application_id ?? trackerApplicationId
  const applyUrl = archivedOffer?.apply_url?.trim() || ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="platform-form-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isArchived ? t('offerte.archivedTitle') : t('offerte.archivedMissing')}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              {isArchived ? (
                <>
                  <p>
                    <strong className="text-foreground">{archivedOffer!.company}</strong>
                    {' · '}
                    {archivedOffer!.role}
                  </p>
                  <p>{t('offerte.archivedDescription')}</p>
                </>
              ) : (
                <p>
                  {t('offerte.archivedMissingDescription')}
                  {applicationId != null
                    ? t('offerte.archivedWithTracker')
                    : t('offerte.archivedNoTracker')}
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          {applyUrl ? (
            <Button variant="outline" asChild>
              <a href={applyUrl} target="_blank" rel="noreferrer">
                {t('common.openJobPosting')}
              </a>
            </Button>
          ) : null}
          {applicationId != null ? (
            <Button
              variant="secondary"
              onClick={() => {
                onOpenTracker(applicationId)
                onOpenChange(false)
              }}
            >
              {t('common.openInTracker')}
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)}>
            {t('common.gotIt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
