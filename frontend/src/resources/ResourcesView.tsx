import { useEffect, useState } from 'react'
import { FileText, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/layout/PageLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentsTab } from '@/resources/DocumentsTab'
import { ContactsPanel } from '@/resources/ContactsPanel'
import { navigate, parseRoute, type ResourcesTab } from '@/router'

interface Props {
  initialTab?: ResourcesTab
}

export function ResourcesView({ initialTab = 'documents' }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<ResourcesTab>(initialTab)

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    const sync = () => {
      const route = parseRoute()
      if (route.page !== 'documents') return
      if (route.resourcesTab) setTab(route.resourcesTab)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const onTabChange = (value: string) => {
    const next = value as ResourcesTab
    setTab(next)
    navigate({ page: 'documents', resourcesTab: next })
  }

  return (
    <PageLayout
      title={t('resources.title')}
      description={t('resources.description')}
    >
      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" />
            {t('resources.tabDocuments')}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-4 w-4" />
            {t('resources.tabContacts')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactsPanel />
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
