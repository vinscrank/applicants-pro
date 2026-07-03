import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'candidature_v2_banner_dismissed'

export function V2MigrationBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) !== '1')
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
      <p className="text-sm text-muted-foreground">{t('v2.migrationBanner')}</p>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismiss}>
        <X className="h-4 w-4" />
        <span className="sr-only">{t('common.close')}</span>
      </Button>
    </div>
  )
}
