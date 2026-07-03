import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/layout/PageLayout'
import { CareersCompaniesPanel } from '@/companies/CareersCompaniesPanel'
import { offerteFetch } from '@/offerte/api'
import type { Company } from '@/offerte/types'
import type { LlmStats } from '@/offerte/types/llm'
import { billingApi, type BillingStatus } from '@/billing/api'

export function CompaniesView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [llmStats, setLlmStats] = useState<LlmStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canUseOfferte = billing?.features.offerte_live === true

  const loadBilling = useCallback(async () => {
    try {
      setBilling(await billingApi.status())
    } catch {
      setBilling(null)
    }
  }, [])

  const loadLlmStats = useCallback(async () => {
    if (!canUseOfferte) {
      setLlmStats(null)
      return
    }
    try {
      setLlmStats(await offerteFetch<LlmStats>('/api/offerte/llm/stats'))
    } catch {
      setLlmStats(null)
    }
  }, [canUseOfferte])

  const loadCompanies = useCallback(async () => {
    if (!canUseOfferte) {
      setCompanies([])
      return
    }
    try {
      setCompanies(await offerteFetch<Company[]>('/api/offerte/companies?include_inactive=true'))
    } catch {
      setCompanies([])
    }
  }, [canUseOfferte])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  useEffect(() => {
    if (!canUseOfferte) return
    loadLlmStats()
    loadCompanies()
  }, [canUseOfferte, loadLlmStats, loadCompanies])

  const inner = (
    <>
      {(statusMessage || errorMessage) && (
        <p className={`mb-4 text-sm ${errorMessage ? 'text-destructive' : 'text-muted-foreground'}`}>
          {errorMessage || statusMessage}
        </p>
      )}
      {!canUseOfferte ? (
        <p className="text-sm text-muted-foreground">{t('companies.offerteRequired')}</p>
      ) : (
        <CareersCompaniesPanel
          companies={companies}
          onRefresh={loadCompanies}
          discovering={discovering}
          onDiscoveringChange={setDiscovering}
          onError={setErrorMessage}
          onSuccess={setStatusMessage}
          onLlmRefresh={loadLlmStats}
          discoverCompanyEnabled={llmStats?.discover_company_enabled ?? false}
          autoDiscoverEnabled={llmStats?.auto_discover_enabled ?? false}
        />
      )}
    </>
  )

  if (embedded) return inner

  return (
    <PageLayout title={t('companies.title')} description={t('companies.description')}>
      {inner}
    </PageLayout>
  )
}
