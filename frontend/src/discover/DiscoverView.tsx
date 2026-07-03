import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/layout/PageLayout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { navigate, parseRoute, type DiscoverTab } from '@/router'
import { SearchTab } from '@/discover/tabs/SearchTab'
import { UrlTab } from '@/discover/tabs/UrlTab'
import { CareersTab } from '@/discover/tabs/CareersTab'
import { CompaniesTab } from '@/discover/tabs/CompaniesTab'

const DISCOVER_TABS: DiscoverTab[] = ['search', 'url', 'careers', 'companies']

export function DiscoverView() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<DiscoverTab>(() => {
    const route = parseRoute()
    return route.page === 'discover' ? route.tab ?? 'search' : 'search'
  })

  useEffect(() => {
    const sync = () => {
      const route = parseRoute()
      if (route.page === 'discover') {
        setTab(route.tab ?? 'search')
      }
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const handleTabChange = (value: string) => {
    const next = value as DiscoverTab
    setTab(next)
    navigate({ page: 'discover', tab: next })
  }

  return (
    <PageLayout title={t('discover.title')} description={t('discover.description')}>
      <Tabs value={tab} onValueChange={handleTabChange} className="mb-6">
        <TabsList className="flex h-auto flex-wrap gap-1">
          {DISCOVER_TABS.map((id) => (
            <TabsTrigger key={id} value={id}>
              {t(`discover.tabs.${id}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {tab === 'search' && <SearchTab />}
      {tab === 'url' && <UrlTab />}
      {tab === 'careers' && <CareersTab />}
      {tab === 'companies' && <CompaniesTab />}
    </PageLayout>
  )
}
