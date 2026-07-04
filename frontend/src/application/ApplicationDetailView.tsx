import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useApplicationQuery } from '@/hooks/useApplicationQuery'
import { navigate } from '@/router'
import { PageLoading } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { ApplicationStatusBadge } from '@/applications/ApplicationStatusBadge'
import { mapDbStatusToUi } from '@/applications/status'
import { methodLabel, remoteLabel, statusLabel } from '@/i18n/labels'
import { formatAppDate, appDateLocale } from '@/i18n/date'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import '@/applications/applications-page.css'
import './application-detail.css'

interface Props {
  applicationId: number
}

type DetailTab = 'overview' | 'timeline' | 'contacts'

const DETAIL_TABS: DetailTab[] = ['overview', 'timeline', 'contacts']

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (!min && !max) return null
  const fmt = new Intl.NumberFormat(appDateLocale(), { style: 'currency', currency, maximumFractionDigits: 0 })
  if (min && max) return `${fmt.format(min)} - ${fmt.format(max)}`
  if (min) return t('applicationDetail.salaryFrom', { value: fmt.format(min) })
  if (max) return t('applicationDetail.salaryUpTo', { value: fmt.format(max) })
  return null
}

function formatDateOrEmpty(dateStr: string | null, t: (key: string) => string): string {
  if (!dateStr) return t('common.notSpecified')
  return formatAppDate(dateStr, { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

export function ApplicationDetailView({ applicationId }: Props) {
  const { t } = useTranslation()
  const { application, loading } = useApplicationQuery(applicationId)
  const [tab, setTab] = useState<DetailTab>('overview')

  const timelineItems = useMemo(() => {
    if (!application) return []
    const items: { id: string; title: string; meta: string }[] = [
      {
        id: 'created',
        title: t('applicationDetail.timelineCreated'),
        meta: formatAppDate(application.created_at, { day: 'numeric', month: 'long', year: 'numeric' }),
      },
    ]
    if (application.last_applied_at && application.status !== 'draft') {
      items.push({
        id: 'applied',
        title: t('applicationDetail.timelineApplied'),
        meta: formatAppDate(application.last_applied_at, { day: 'numeric', month: 'long', year: 'numeric' }),
      })
    }
    if (application.response_received_at) {
      items.push({
        id: 'response',
        title: t('applicationDetail.timelineResponse'),
        meta: formatAppDate(application.response_received_at, { day: 'numeric', month: 'long', year: 'numeric' }),
      })
    }
    if (application.interview_date) {
      items.push({
        id: 'interview',
        title: t('applicationDetail.timelineInterview'),
        meta: formatAppDate(application.interview_date, { day: 'numeric', month: 'long', year: 'numeric' }),
      })
    }
    if (application.last_contact_date) {
      items.push({
        id: 'contact',
        title: t('applicationDetail.timelineContact'),
        meta: formatAppDate(application.last_contact_date, { day: 'numeric', month: 'long', year: 'numeric' }),
      })
    }
    return items
  }, [application, t])

  if (loading) {
    return (
      <div className="apps-page">
        <header className="apps-hero">
          <div className="apps-hero-copy">
            <h1 className="apps-hero-title">{t('common.loading')}</h1>
          </div>
        </header>
        <PageLoading />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="apps-page">
        <header className="apps-hero">
          <button type="button" className="application-detail-back" onClick={() => navigate({ page: 'candidature' })}>
            <ArrowLeft className="h-4 w-4" />
            {t('applicationDetail.backToList')}
          </button>
          <div className="apps-hero-copy">
            <h1 className="apps-hero-title">{t('applicationDetail.notFound')}</h1>
            <p className="apps-hero-description">{t('applicationDetail.notFoundDescription')}</p>
          </div>
        </header>
        <section className="apps-content-panel">
          <PlatformEmptyState
            title={t('applicationDetail.notFound')}
            description={t('applicationDetail.notFoundEmpty')}
            actionLabel={t('applicationDetail.goToApplications')}
            onAction={() => navigate({ page: 'candidature' })}
          />
        </section>
      </div>
    )
  }

  const salary = formatSalary(application.salary_min, application.salary_max, application.salary_currency, t)

  return (
    <div className="apps-page">
      <header className="apps-hero">
        <button type="button" className="application-detail-back" onClick={() => navigate({ page: 'candidature' })}>
          <ArrowLeft className="h-4 w-4" />
          {t('applicationDetail.backToList')}
        </button>
        <div className="apps-hero-copy">
          <h1 className="apps-hero-title">{application.company_name}</h1>
          <p className="apps-hero-description">{application.job_title}</p>
          <div className="application-detail-hero-meta">
            <ApplicationStatusBadge status={mapDbStatusToUi(application.status)} />
            {application.location ? (
              <span className="text-sm text-muted-foreground">{application.location}</span>
            ) : null}
          </div>
        </div>
        <div className="apps-hero-actions">
          {application.job_url ? (
            <Button variant="outline" asChild>
              <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                {t('applicationDetail.jobPosting')}
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => navigate({ page: 'candidature', highlightApplicationId: application.id })}
          >
            {t('applicationDetail.edit')}
          </Button>
        </div>
      </header>

      <div className="apps-kpi-grid">
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('applicationDetail.kpiStatus')}</p>
          <p className="apps-kpi-value text-base">{statusLabel(application.status)}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('applicationDetail.kpiApplied')}</p>
          <p className="apps-kpi-value text-base">{formatDateOrEmpty(application.last_applied_at, t)}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('applicationDetail.kpiInterview')}</p>
          <p className="apps-kpi-value text-base">{formatDateOrEmpty(application.interview_date, t)}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('applicationDetail.kpiFollowUp')}</p>
          <p className="apps-kpi-value text-base">{formatDateOrEmpty(application.follow_up_date, t)}</p>
        </div>
      </div>

      <div className="apps-control-panel">
        <div className="apps-source-tabs" role="tablist" aria-label={t('applicationDetail.overview')}>
          {DETAIL_TABS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={cn('apps-source-tab', tab === value && 'active')}
              onClick={() => setTab(value)}
            >
              {t(`applicationDetail.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <section className="apps-content-panel">
        {tab === 'overview' ? (
          <>
            <div className="apps-section">
              <h3 className="apps-section-title">{t('applicationDetail.positionDetails')}</h3>
              <dl className="application-detail-dl">
                {application.location ? (
                  <DetailRow label={t('applicationDetail.location')} value={application.location} />
                ) : null}
                {application.remote_type ? (
                  <DetailRow label={t('applicationDetail.modality')} value={remoteLabel(application.remote_type)} />
                ) : null}
                {salary ? <DetailRow label={t('applicationDetail.salary')} value={salary} /> : null}
                {application.application_method ? (
                  <DetailRow label={t('applicationDetail.channel')} value={methodLabel(application.application_method)} />
                ) : null}
                {application.visa_sponsorship !== null ? (
                  <DetailRow
                    label={t('applicationDetail.visa')}
                    value={application.visa_sponsorship ? t('common.yes') : t('common.no')}
                  />
                ) : null}
              </dl>
            </div>

            {(application.job_url || application.company_website || application.company_linkedin_url) ? (
              <div className="apps-section">
                <h3 className="apps-section-title">{t('applicationDetail.links')}</h3>
                <div className="application-detail-links">
                  {application.job_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {t('applicationDetail.jobPosting')}
                      </a>
                    </Button>
                  ) : null}
                  {application.company_website ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={application.company_website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {t('applicationDetail.companySite')}
                      </a>
                    </Button>
                  ) : null}
                  {application.company_linkedin_url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={application.company_linkedin_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        {t('applicationDetail.companyLinkedIn')}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {application.notes ? (
              <div className="apps-section">
                <h3 className="apps-section-title">{t('applicationDetail.notes')}</h3>
                <p className="application-detail-notes">{application.notes}</p>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === 'timeline' ? (
          <div className="application-detail-timeline">
            {timelineItems.map((item, index) => (
              <div key={item.id} className="application-detail-timeline-item">
                <div className="application-detail-timeline-marker">
                  <div className="application-detail-timeline-dot" />
                  {index < timelineItems.length - 1 ? <div className="application-detail-timeline-line" /> : null}
                </div>
                <div className="application-detail-timeline-copy">
                  <p className="application-detail-timeline-title">{item.title}</p>
                  <p className="application-detail-timeline-meta">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {tab === 'contacts' ? (
          <>
            {application.ta_name ? (
              <div className="application-detail-contact-card">
                <p className="application-detail-contact-role">{t('resources.recruiter')}</p>
                <dl className="application-detail-dl">
                  <DetailRow label={t('profile.firstName')} value={application.ta_name} />
                  {application.ta_email ? (
                    <DetailRow
                      label={t('auth.email')}
                      value={
                        <a href={`mailto:${application.ta_email}`}>{application.ta_email}</a>
                      }
                    />
                  ) : null}
                  {application.ta_phone ? (
                    <DetailRow
                      label={t('profile.phone')}
                      value={
                        <a href={`tel:${application.ta_phone}`}>{application.ta_phone}</a>
                      }
                    />
                  ) : null}
                </dl>
              </div>
            ) : null}

            {application.hiring_manager_name ? (
              <div className="application-detail-contact-card">
                <p className="application-detail-contact-role">{t('resources.hiringManager')}</p>
                <dl className="application-detail-dl">
                  <DetailRow label={t('profile.firstName')} value={application.hiring_manager_name} />
                </dl>
              </div>
            ) : null}

            {!application.ta_name && !application.hiring_manager_name ? (
              <PlatformEmptyState
                title={t('applicationDetail.noContacts')}
                description={t('applicationDetail.noContactsHint')}
              />
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  )
}
