import { FileText, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function ApplicationsEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{t('candidature.emptyTitle')}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        {t('candidature.emptyDescription')}
      </p>
      <Button className="mt-6" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {t('candidature.emptyAction')}
      </Button>
    </div>
  )
}
