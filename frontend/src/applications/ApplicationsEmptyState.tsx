import { FileText, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export function ApplicationsEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="apps-empty">
      <div className="apps-empty-icon">
        <FileText className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h3 className="apps-empty-title">{t('candidature.emptyTitle')}</h3>
      <p className="apps-empty-description">{t('candidature.emptyDescription')}</p>
      <Button className="mt-6" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {t('candidature.emptyAction')}
      </Button>
    </div>
  )
}
