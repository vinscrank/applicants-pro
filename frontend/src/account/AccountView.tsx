'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Mail, ShieldCheck, UserCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProfileView } from '@/profile/ProfileView'
import { BillingView } from '@/billing/BillingView'
import { useAuth } from '@/auth/AuthContext'
import { billingApi, type BillingStatus } from '@/billing/api'
import { navigate, parseRoute, type AccountTab } from '@/router'
import { cn } from '@/lib/utils'
import './account.css'

const ACCOUNT_TABS: AccountTab[] = ['profile', 'billing']

const TAB_META: Record<
  AccountTab,
  { icon: typeof UserCircle; titleKey: string; hintKey: string }
> = {
  profile: {
    icon: UserCircle,
    titleKey: 'account.tabs.profile',
    hintKey: 'account.profileHint',
  },
  billing: {
    icon: CreditCard,
    titleKey: 'account.tabs.billing',
    hintKey: 'account.billingHint',
  },
}

export function AccountView() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [tab, setTab] = useState<AccountTab>(() => {
    const route = parseRoute()
    return route.page === 'account' ? route.accountTab ?? 'profile' : 'profile'
  })

  useEffect(() => {
    billingApi
      .status()
      .then(setBilling)
      .catch(() => setBilling(null))
  }, [])

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

  const handleTabChange = (value: AccountTab) => {
    setTab(value)
    navigate({ page: 'account', accountTab: value })
  }

  const email = user?.email ?? ''
  const initial = email.charAt(0).toUpperCase() || 'A'
  const activeMeta = TAB_META[tab]
  const ActiveIcon = activeMeta.icon

  return (
    <div className="account-page">
      <header className="account-hero">
        <div className="account-hero-user">
          <div className="account-hero-avatar" aria-hidden>
            {initial}
          </div>
          <div className="account-hero-copy">
            <h1 className="account-hero-title">{t('account.title')}</h1>
            <p className="account-hero-description">{t('account.description')}</p>
            {email ? (
              <p className="account-hero-email">
                <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{email}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="account-hero-badges">
          {billing?.plan_name ? (
            <span className="account-badge account-badge-plan">{billing.plan_name}</span>
          ) : null}
          <span
            className={cn(
              'account-badge',
              profile?.profile_complete ? 'account-badge-complete' : 'account-badge-incomplete',
            )}
          >
            <ShieldCheck className="h-3 w-3" strokeWidth={2} />
            {profile?.profile_complete ? t('profile.complete') : t('profile.incomplete')}
          </span>
        </div>
      </header>

      <div className="account-mobile-nav" role="tablist" aria-label={t('account.title')}>
        {ACCOUNT_TABS.map((id) => {
          const meta = TAB_META[id]
          const Icon = meta.icon
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn('account-mobile-nav-item', active && 'active')}
              onClick={() => handleTabChange(id)}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {t(meta.titleKey)}
            </button>
          )
        })}
      </div>

      <div className="account-layout">
        <nav className="account-nav" aria-label={t('account.title')}>
          <p className="account-nav-label">{t('account.sectionsLabel')}</p>
          {ACCOUNT_TABS.map((id) => {
            const meta = TAB_META[id]
            const Icon = meta.icon
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                className={cn('account-nav-item', active && 'active')}
                onClick={() => handleTabChange(id)}
              >
                <span className="account-nav-item-icon">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="account-nav-item-copy">
                  <span className="account-nav-item-title">{t(meta.titleKey)}</span>
                  <span className="account-nav-item-hint">{t(meta.hintKey)}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <section className="account-panel" aria-labelledby="account-panel-title">
          <header className="account-panel-header">
            <div>
              <h2 id="account-panel-title" className="account-panel-title">
                {t(activeMeta.titleKey)}
              </h2>
              <p className="account-panel-description">{t(activeMeta.hintKey)}</p>
            </div>
            <span className="account-nav-item-icon" aria-hidden>
              <ActiveIcon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </header>
          <div className="account-panel-content">
            {tab === 'profile' && <ProfileView embedded />}
            {tab === 'billing' && <BillingView embedded />}
          </div>
        </section>
      </div>
    </div>
  )
}
