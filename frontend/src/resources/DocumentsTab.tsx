import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navigate } from '@/router'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'

export function DocumentsTab() {
  const { t } = useTranslation()

  return (
    <PlatformEmptyState
      icon={<FileText className="h-7 w-7" />}
      title={t('common.comingSoon')}
      description={t('resources.documentsSoon')}
      actionLabel={t('common.goToProfile')}
      onAction={() => navigate({ page: 'account', accountTab: 'profile' })}
    />
  )
}
