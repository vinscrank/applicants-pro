import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useApplicationQuery } from '@/hooks/useApplicationQuery'
import { navigate } from '@/router'
import { PageLayout, PageLoading } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { ApplicationStatusBadge } from '@/applications/ApplicationStatusBadge'
import { mapDbStatusToUi } from '@/applications/status'
import { methodLabel, remoteLabel } from '@/i18n/labels'
import { formatAppDate, appDateLocale } from '@/i18n/date'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  applicationId: number
}

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-2 border-b border-border last:border-0 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function ApplicationDetailView({ applicationId }: Props) {
  const { t } = useTranslation()
  const { application, loading } = useApplicationQuery(applicationId)

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
      <PageLayout title={t('common.loading')} width="lg">
        <PageLoading />
      </PageLayout>
    )
  }

  if (!application) {
    return (
      <PageLayout
        title={t('applicationDetail.notFound')}
        description={t('applicationDetail.notFoundDescription')}
        width="lg"
        actions={
          <Button variant="outline" onClick={() => navigate({ page: 'candidature' })}>
            <ArrowLeft className="h-4 w-4" />
            {t('applicationDetail.backToList')}
          </Button>
        }
      >
        <PlatformEmptyState
          title={t('applicationDetail.notFound')}
          description={t('applicationDetail.notFoundEmpty')}
          actionLabel={t('applicationDetail.goToApplications')}
          onAction={() => navigate({ page: 'candidature' })}
        />
      </PageLayout>
    )
  }

  const salary = formatSalary(application.salary_min, application.salary_max, application.salary_currency, t)

  return (
    <PageLayout
      title={application.company_name}
      description={application.job_title}
      width="lg"
      actions={
        <>
          <ApplicationStatusBadge status={mapDbStatusToUi(application.status)} />
          <Button variant="outline" onClick={() => navigate({ page: 'candidature', highlightApplicationId: application.id })}>
            {t('applicationDetail.edit')}
          </Button>
        </>
      }
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('applicationDetail.overview')}</TabsTrigger>
          <TabsTrigger value="timeline">{t('applicationDetail.timeline')}</TabsTrigger>
          <TabsTrigger value="contacts">{t('applicationDetail.contacts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('applicationDetail.positionDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl>
                {application.location && <DetailRow label={t('applicationDetail.location')} value={application.location} />}
                {application.remote_type && (
                  <DetailRow label={t('applicationDetail.modality')} value={remoteLabel(application.remote_type)} />
                )}
                {salary && <DetailRow label={t('applicationDetail.salary')} value={salary} />}
                {application.application_method && (
                  <DetailRow label={t('applicationDetail.channel')} value={methodLabel(application.application_method)} />
                )}
                {application.visa_sponsorship !== null && (
                  <DetailRow label={t('applicationDetail.visa')} value={application.visa_sponsorship ? t('common.yes') : t('common.no')} />
                )}
              </dl>
            </CardContent>
          </Card>

          {(application.job_url || application.company_website || application.company_linkedin_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('applicationDetail.links')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {application.job_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={application.job_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      {t('applicationDetail.jobPosting')}
                    </a>
                  </Button>
                )}
                {application.company_website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={application.company_website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      {t('applicationDetail.companySite')}
                    </a>
                  </Button>
                )}
                {application.company_linkedin_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={application.company_linkedin_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      {t('applicationDetail.companyLinkedIn')}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {application.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('applicationDetail.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{application.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('applicationDetail.timeline')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {timelineItems.map((item, i) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                    {i < timelineItems.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.meta}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4 mt-4">
          {application.ta_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('resources.recruiter')}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <DetailRow label={t('profile.firstName')} value={application.ta_name} />
                  {application.ta_email && (
                    <DetailRow
                      label={t('auth.email')}
                      value={
                        <a href={`mailto:${application.ta_email}`} className="text-primary hover:underline">
                          {application.ta_email}
                        </a>
                      }
                    />
                  )}
                  {application.ta_phone && (
                    <DetailRow
                      label={t('profile.phone')}
                      value={
                        <a href={`tel:${application.ta_phone}`} className="text-primary hover:underline">
                          {application.ta_phone}
                        </a>
                      }
                    />
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {application.hiring_manager_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('resources.hiringManager')}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl>
                  <DetailRow label={t('profile.firstName')} value={application.hiring_manager_name} />
                </dl>
              </CardContent>
            </Card>
          )}

          {!application.ta_name && !application.hiring_manager_name && (
            <PlatformEmptyState
              title={t('applicationDetail.noContacts')}
              description={t('applicationDetail.noContactsHint')}
            />
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
