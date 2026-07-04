'use client'

import { useEffect, useState } from 'react'
import {
  Building2,
  Clock,
  Compass,
  Link2,
  Search,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navigate, parseRoute, type DiscoverTab } from '@/router'
import { cn } from '@/lib/utils'
import { SearchTab } from '@/discover/tabs/SearchTab'
import { UrlTab } from '@/discover/tabs/UrlTab'
import { CareersTab } from '@/discover/tabs/CareersTab'
import { CompaniesTab } from '@/discover/tabs/CompaniesTab'
import './discover-page.css'

const DISCOVER_TABS: DiscoverTab[] = ['search', 'url', 'careers', 'companies']

const TAB_META: Record<
  DiscoverTab,
  { icon: typeof Search; titleKey: string; hintKey: string; featured?: boolean }
> = {
  search: {
    icon: Sparkles,
    titleKey: 'discover.tabs.search',
    hintKey: 'discover.searchHint',
    featured: true,
  },
  url: {
    icon: Link2,
    titleKey: 'discover.tabs.url',
    hintKey: 'discover.urlHint',
  },
  careers: {
    icon: Clock,
    titleKey: 'discover.tabs.careers',
    hintKey: 'discover.careersHint',
  },
  companies: {
    icon: Building2,
    titleKey: 'discover.tabs.companies',
    hintKey: 'discover.companiesHint',
  },
}

function DiscoverTabPanel({ tab }: { tab: DiscoverTab }) {
  switch (tab) {
    case 'search':
      return <SearchTab />
    case 'url':
      return <UrlTab />
    case 'careers':
      return <CareersTab />
    case 'companies':
      return <CompaniesTab />
  }
}

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

  const handleTabChange = (value: DiscoverTab) => {
    setTab(value)
    navigate({ page: 'discover', tab: value })
  }

  const activeMeta = TAB_META[tab]
  const ActiveIcon = activeMeta.icon

  return (
    <div className="discover-page">
      <header className="discover-hero">
        <div className="discover-hero-copy">
          <div className="discover-hero-mark" aria-hidden>
            <Compass className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="discover-hero-text">
            <h1 className="discover-hero-title">{t('discover.title')}</h1>
            <p className="discover-hero-description">{t('discover.pageLead')}</p>
          </div>
        </div>
        <span className="discover-hero-badge">{t('discover.premiumBadge')}</span>
      </header>

      <div className="discover-mobile-nav" role="tablist" aria-label={t('discover.title')}>
        {DISCOVER_TABS.map((id) => {
          const meta = TAB_META[id]
          const Icon = meta.icon
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn('discover-mobile-nav-item', active && 'active')}
              onClick={() => handleTabChange(id)}
            >
              <span className="discover-mobile-nav-title">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                {t(meta.titleKey)}
              </span>
              <span className="discover-nav-item-hint">{t(meta.hintKey)}</span>
            </button>
          )
        })}
      </div>

      <div className="discover-layout">
        <nav className="discover-nav" aria-label={t('discover.title')}>
          <p className="discover-nav-label">{t('discover.sectionsLabel')}</p>
          {DISCOVER_TABS.map((id) => {
            const meta = TAB_META[id]
            const Icon = meta.icon
            const active = tab === id
            return (
              <button
                key={id}
                type="button"
                className={cn(
                  'discover-nav-item',
                  active && 'active',
                  meta.featured && 'discover-nav-item-featured',
                )}
                onClick={() => handleTabChange(id)}
              >
                <span className="discover-nav-item-icon">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="discover-nav-item-copy">
                  <span className="discover-nav-item-title">{t(meta.titleKey)}</span>
                  <span className="discover-nav-item-hint">{t(meta.hintKey)}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <section className="discover-panel" aria-labelledby="discover-panel-title">
          <header className="discover-panel-header">
            <div>
              <h2 id="discover-panel-title" className="discover-panel-title">
                {t(activeMeta.titleKey)}
              </h2>
              <p className="discover-panel-description">{t(activeMeta.hintKey)}</p>
            </div>
            <span className="discover-nav-item-icon" aria-hidden>
              <ActiveIcon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </header>
          <div className="discover-panel-content">
            <DiscoverTabPanel tab={tab} />
          </div>
        </section>
      </div>
    </div>
  )
}
