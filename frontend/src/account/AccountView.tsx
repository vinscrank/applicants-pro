import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProfileView } from '@/profile/ProfileView'
import { BillingView } from '@/billing/BillingView'
import { AssistantView } from '@/assistant/AssistantView'
import { PageLayout } from '@/layout/PageLayout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { navigate, parseRoute, type AccountTab } from '@/router'

const ACCOUNT_TABS: AccountTab[] = ['profile', 'billing', 'assistant']

export function AccountView() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<AccountTab>(() => {
    const route = parseRoute()
    return route.page === 'account' ? route.accountTab ?? 'profile' : 'profile'
  })

  useEffect(() => {
    const sync = () => {
      const route = parseRoute()
      if (route.page === 'account') {
        setTab(route.accountTab ?? 'profile')
      }
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const handleTabChange = (value: string) => {
    const next = value as AccountTab
    setTab(next)
    navigate({ page: 'account', accountTab: next })
  }

  return (
    <PageLayout title={t('account.title')} description={t('account.description')}>
      <Tabs value={tab} onValueChange={handleTabChange} className="mb-6">
        <TabsList>
          {ACCOUNT_TABS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {t(`account.tabs.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tab === 'profile' && <ProfileView embedded />}
      {tab === 'billing' && <BillingView embedded />}
      {tab === 'assistant' && <AssistantView embedded />}
    </PageLayout>
  )
}
