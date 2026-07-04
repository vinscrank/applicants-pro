import { authFetch } from '../auth/http'

export interface PlanPublic {
  id: string
  name: string
  price_eur_month: number
  price_eur_year: number
  offerte_live: boolean
  ai_calls_month: number
  auto_discover: boolean
  companion_autofill: boolean
  applications_max: number
  highlights: string[]
}

export interface BillingStatus {
  billing_enabled: boolean
  is_owner: boolean
  plan_id: string
  plan_name: string
  subscription_status: string
  subscription_period_end: string | null
  features: {
    offerte_live: boolean
    ai_calls_month: number
    ai_calls_used: number
    auto_discover: boolean
    companion_autofill: boolean
    applications_max: number
  }
}

type JavaBillingFeatures = {
  offerteLive?: boolean
  aiCallsMonth?: number
  aiCallsUsed?: number
  autoDiscover?: boolean
  companionAutofill?: boolean
  applicationsMax?: number
}

type JavaBillingStatus = {
  planId?: string
  planName?: string
  planTier?: string
  isOwner?: boolean
  subscriptionStatus?: string
  subscriptionPeriodEnd?: string | null
  stripeConfigured?: boolean
  features?: JavaBillingFeatures
}

const BILLING_PREFIX = '/api/v2/billing'

function mapBillingStatus(raw: JavaBillingStatus): BillingStatus {
  const planId = raw.planId ?? raw.planTier ?? 'free'
  const features = raw.features
  return {
    billing_enabled: Boolean(raw.stripeConfigured),
    is_owner: Boolean(raw.isOwner),
    plan_id: planId,
    plan_name: raw.planName ?? planId,
    subscription_status: raw.subscriptionStatus ?? 'none',
    subscription_period_end: raw.subscriptionPeriodEnd ?? null,
    features: {
      offerte_live: features?.offerteLive ?? planId !== 'free',
      ai_calls_month: features?.aiCallsMonth ?? (planId !== 'free' ? 200 : 0),
      ai_calls_used: features?.aiCallsUsed ?? 0,
      auto_discover: features?.autoDiscover ?? (planId === 'owner' || planId === 'business'),
      companion_autofill: features?.companionAutofill ?? planId !== 'free',
      applications_max: features?.applicationsMax ?? (planId === 'free' ? 40 : 500),
    },
  }
}

export const billingApi = {
  plans: async (): Promise<{ plans: PlanPublic[]; billing_enabled: boolean }> => {
    try {
      return await authFetch(`${BILLING_PREFIX}/plans`)
    } catch {
      return {
        billing_enabled: false,
        plans: [
          {
            id: 'free',
            name: 'Free',
            price_eur_month: 0,
            price_eur_year: 0,
            offerte_live: false,
            ai_calls_month: 0,
            auto_discover: false,
            companion_autofill: false,
            applications_max: 50,
            highlights: [],
          },
        ],
      }
    }
  },
  status: async (): Promise<BillingStatus> => {
    const raw = await authFetch<JavaBillingStatus>(`${BILLING_PREFIX}/status`)
    return mapBillingStatus(raw)
  },
  checkout: async (_plan_id: string, _interval: 'month' | 'year') => {
    const data = await authFetch<{ checkoutUrl?: string; checkout_url?: string }>(
      `${BILLING_PREFIX}/checkout`,
      { method: 'POST', body: JSON.stringify({}) },
    )
    return { checkout_url: data.checkoutUrl ?? data.checkout_url ?? '' }
  },
  portal: async () => {
    try {
      return await authFetch<{ portal_url: string }>(`${BILLING_PREFIX}/portal`, {
        method: 'POST',
      })
    } catch {
      throw new Error('Customer portal not available yet')
    }
  },
}
