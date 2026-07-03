import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { UI_STATUS_CONFIG, type UiStatusKey } from './status'

export function ApplicationStatusBadge({ status }: { status: UiStatusKey }) {
  const { t } = useTranslation()
  const config = UI_STATUS_CONFIG[status]
  return (
    <Badge variant="outline" className={cn('font-medium border', config.className)}>
      {t(config.labelKey)}
    </Badge>
  )
}
