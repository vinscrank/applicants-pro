import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { billingApi, type BillingStatus, type PlanPublic } from './api'
import { navigate } from '../router'
import { PageLayout, PageLoading } from '@/layout/PageLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function formatSubscriptionStatus(status: BillingStatus, t: (key: string) => string): string {
  if (status.is_owner || status.plan_id === 'owner') return t('billing.fullAccess')
  if (status.subscription_status === 'none') return t('billing.freePlan')
  if (status.subscription_status === 'active') return t('billing.activeSubscription')
  if (status.subscription_status === 'trialing') return t('billing.trialActive')
  if (status.subscription_status === 'canceled') return t('billing.canceled')
  return status.subscription_status
}

function planBadgeVariant(status: BillingStatus): 'default' | 'secondary' | 'outline' {
  if (status.is_owner || status.plan_id === 'owner') return 'default'
  if (status.plan_id === 'pro' || status.plan_id === 'business') return 'secondary'
  return 'outline'
}

export function BillingView({ embedded = false }: { embedded?: boolean } = {}) {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [plans, setPlans] = useState<PlanPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([billingApi.status(), billingApi.plans()])
      .then(([billingStatus, plansData]) => {
        setStatus(billingStatus)
        setPlans(plansData.plans)
      })
      .catch((e) => setError(e instanceof Error ? e.message : t('billing.loadFailed')))
      .finally(() => setLoading(false))
  }, [])

  const checkout = async (plan_id: string, interval: 'month' | 'year') => {
    setCheckoutPlan(plan_id)
    setError(null)
    try {
      const { checkout_url } = await billingApi.checkout(plan_id, interval)
      window.location.href = checkout_url
    } catch (e) {
      setError(e instanceof Error ? e.message : t('billing.checkoutFailed'))
    } finally {
      setCheckoutPlan(null)
    }
  }

  const openPortal = async () => {
    setError(null)
    try {
      const { portal_url } = await billingApi.portal()
      window.location.href = portal_url
    } catch (e) {
      setError(e instanceof Error ? e.message : t('billing.portalUnavailable'))
    }
  }

  if (loading) {
    const loadingEl = <PageLoading />
    if (embedded) return loadingEl
    return (
      <PageLayout title={t('billing.title')} description={t('billing.description')}>
        {loadingEl}
      </PageLayout>
    )
  }

  const isOwner = status?.is_owner === true

  const content = (
    <>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {status ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
              <div>
                <h2 className="text-lg font-semibold">
                  {isOwner ? t('billing.ownerAccount') : t('billing.plan', { name: status.plan_name })}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isOwner
                    ? t('billing.ownerDescription')
                    : formatSubscriptionStatus(status, t)}
                  {!isOwner && status.subscription_period_end
                    ? t('billing.renewal', {
                        date: new Date(status.subscription_period_end).toLocaleDateString(i18n.language),
                      })
                    : ''}
                </p>
              </div>
              <Badge variant={planBadgeVariant(status)}>{status.plan_name}</Badge>
            </CardContent>
          </Card>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('billing.usageTitle')}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('billing.liveOffers')}</p>
                  <p
                    className={cn(
                      'mt-2 text-lg font-semibold',
                      status.features.live_jobs ? 'text-emerald-700' : 'text-muted-foreground',
                    )}
                  >
                    {status.features.live_jobs ? t('billing.active') : t('billing.notIncluded')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {status.features.live_jobs ? t('billing.liveOffersHintActive') : t('billing.liveOffersHintInactive')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('billing.aiCalls')}</p>
                  <p className="mt-2 text-lg font-semibold tabular-nums">
                    {status.features.ai_calls_used}
                    {' / '}
                    {isOwner ? t('billing.unlimited') : status.features.ai_calls_month || '—'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('billing.aiCallsHint')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('billing.applications')}</p>
                  <p className="mt-2 text-lg font-semibold">
                    {isOwner ? t('billing.unlimited') : status.features.applications_max}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('billing.applicationsLimitHint')}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {!isOwner && !status.billing_enabled && status.plan_id === 'free' ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t('billing.stripeNotEnabled')}
              </CardContent>
            </Card>
          ) : null}

          {!isOwner && plans.length > 0 ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('billing.availablePlans')}
              </p>
              <div className="grid gap-4 lg:grid-cols-3">
                {plans.map((plan) => {
                  const isCurrent = status.plan_id === plan.id
                  const isFeatured = plan.id === 'pro'
                  return (
                    <Card
                      key={plan.id}
                      className={cn(
                        isCurrent && 'border-primary/40',
                        isFeatured && !isCurrent && 'border-accent/50 shadow-sm',
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          {isCurrent && <Badge variant="outline">{t('billing.currentBadge')}</Badge>}
                        </div>
                        <div className="pt-2">
                          <span className="text-2xl font-semibold tabular-nums">
                            {plan.price_eur_month === 0 ? '0' : plan.price_eur_month.toFixed(2)}
                          </span>
                          <span className="ml-1 text-sm text-muted-foreground">{t('billing.eurMonth')}</span>
                          {plan.price_eur_year > 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">{t('billing.eurYear', { price: plan.price_eur_year })}</p>
                          ) : null}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {plan.highlights.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="text-foreground">·</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {plan.id === 'free' ? (
                          <Button type="button" variant="secondary" className="w-full" disabled>
                            {isCurrent ? t('billing.currentPlan') : t('billing.included')}
                          </Button>
                        ) : isCurrent ? (
                          <Button type="button" variant="secondary" className="w-full" disabled>
                            {t('billing.currentPlan')}
                          </Button>
                        ) : status.billing_enabled ? (
                          <Button
                            type="button"
                            className="w-full"
                            variant={isFeatured ? 'default' : 'outline'}
                            disabled={checkoutPlan === plan.id}
                            onClick={() => checkout(plan.id, 'month')}
                          >
                            {checkoutPlan === plan.id ? t('billing.redirecting') : t('billing.upgradeTo', { name: plan.name })}
                          </Button>
                        ) : (
                          <Button type="button" variant="outline" className="w-full" disabled>
                            {t('billing.comingSoon')}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )

  if (embedded) return content

  return (
    <PageLayout
      title={t('billing.title')}
      description={t('billing.description')}
      actions={
        !isOwner && status?.plan_id !== 'free' && status?.billing_enabled ? (
          <Button type="button" variant="outline" onClick={openPortal}>
            {t('billing.manageStripe')}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={() => navigate({ page: 'discover', tab: 'search' })}>
            {t('billing.liveOffers')}
          </Button>
        )
      }
    >
      {content}
    </PageLayout>
  )
}
