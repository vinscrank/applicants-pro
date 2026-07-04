import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageLayout } from '@/layout/PageLayout'
import { CareersCompaniesPanel } from '@/companies/CareersCompaniesPanel'
import { jobsFetch } from '@/jobs/api'
import type { Company } from '@/jobs/types'
import type { LlmStats } from '@/jobs/types/llm'
import { billingApi, type BillingStatus } from '@/billing/api'

export function CompaniesView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [llmStats, setLlmStats] = useState<LlmStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canUseLiveJobs = billing?.features.live_jobs === true

  const loadBilling = useCallback(async () => {
    try {
      setBilling(await billingApi.status())
    } catch {
      setBilling(null)
    }
  }, [])

  const loadLlmStats = useCallback(async () => {
    if (!canUseLiveJobs) {
      setLlmStats(null)
      return
    }
    try {
      setLlmStats(await jobsFetch<LlmStats>('/api/jobs/llm/stats'))
    } catch {
      setLlmStats(null)
    }
  }, [canUseLiveJobs])

  const loadCompanies = useCallback(async () => {
    if (!canUseLiveJobs) {
      setCompanies([])
      return
    }
    try {
      setCompanies(await jobsFetch<Company[]>('/api/jobs/companies?include_inactive=true'))
    } catch {
      setCompanies([])
    }
  }, [canUseLiveJobs])

  useEffect(() => {
    loadBilling()
  }, [loadBilling])

  useEffect(() => {
    if (!canUseLiveJobs) return
    loadLlmStats()
    loadCompanies()
  }, [canUseLiveJobs, loadLlmStats, loadCompanies])

  const inner = (
    <>
      {(statusMessage || errorMessage) && (
        <p className={`mb-4 text-sm ${errorMessage ? 'text-destructive' : 'text-muted-foreground'}`}>
          {errorMessage || statusMessage}
        </p>
      )}
      {!canUseLiveJobs ? (
        <p className="text-sm text-muted-foreground">{t('companies.jobsRequired')}</p>
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
