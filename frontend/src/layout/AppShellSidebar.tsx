import type { ReactNode } from 'react'
import {
  BarChart3,
  Briefcase,
  Compass,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navigate, type AppRoute } from '@/router'
import { cn } from '@/lib/utils'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'
import './sidebar.css'

export type ShellNavId =
  | 'today'
  | 'applications'
  | 'discover'
  | 'progress'
  | 'resources'
  | 'account'

type NavItem = {
  id: ShellNavId
  icon: ReactNode
  route: AppRoute
  featured?: boolean
}

type NavSection = {
  labelKey: string
  items: NavItem[]
}

const NAV_LABEL_KEYS: Record<ShellNavId, string> = {
  today: 'nav.today',
  applications: 'nav.applications',
  discover: 'nav.discover',
  progress: 'nav.progress',
  resources: 'nav.resources',
  account: 'nav.account',
}

const NAV_SECTIONS: NavSection[] = [
  {
    labelKey: 'nav.sectionMain',
    items: [
      { id: 'today', icon: <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />, route: { page: 'dashboard' } },
      { id: 'applications', icon: <Briefcase className="h-4 w-4" strokeWidth={1.75} />, route: { page: 'candidature' } },
      { id: 'discover', icon: <Compass className="h-4 w-4" strokeWidth={1.75} />, route: { page: 'discover' }, featured: true },
    ],
  },
  {
    labelKey: 'nav.sectionInsights',
    items: [
      { id: 'progress', icon: <BarChart3 className="h-4 w-4" strokeWidth={1.75} />, route: { page: 'progress' } },
      { id: 'resources', icon: <FolderOpen className="h-4 w-4" strokeWidth={1.75} />, route: { page: 'documents' } },
    ],
  },
  {
    labelKey: 'nav.sectionAccount',
    items: [
      { id: 'account', icon: <UserCircle className="h-4 w-4" strokeWidth={1.75} />, route: { page: 'account' } },
    ],
  },
]

export function routeToShellNav(route: AppRoute): ShellNavId {
  switch (route.page) {
    case 'dashboard':
      return 'today'
    case 'application':
    case 'candidature':
      return 'applications'
    case 'discover':
      return 'discover'
    case 'progress':
      return 'progress'
    case 'documents':
      return 'resources'
    case 'account':
      return 'account'
    default:
      return 'today'
  }
}

interface AppShellSidebarProps {
  activeNav: ShellNavId
  email: string
  planLabel?: string
  trackerTotal?: number
  discoverMatchCount?: number
  onLogout: () => void
  onNavigate?: () => void
}

function SidebarNavLink({
  item,
  active,
  trackerTotal,
  discoverMatchCount,
  onClick,
  label,
}: {
  item: NavItem
  active: boolean
  trackerTotal: number
  discoverMatchCount: number
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shell-sidebar-link',
        active && 'active',
        item.featured && 'shell-sidebar-link-featured',
      )}
    >
      <span className="shell-sidebar-link-icon">{item.icon}</span>
      <span className="shell-sidebar-link-label">{label}</span>
      {item.id === 'applications' && trackerTotal > 0 ? (
        <span className="shell-sidebar-count">{trackerTotal}</span>
      ) : null}
      {item.id === 'discover' && discoverMatchCount > 0 ? (
        <span className="shell-sidebar-count">{discoverMatchCount}</span>
      ) : null}
    </button>
  )
}

export function AppShellSidebar({
  activeNav,
  email,
  planLabel,
  trackerTotal = 0,
  discoverMatchCount = 0,
  onLogout,
  onNavigate,
}: AppShellSidebarProps) {
  const { t } = useTranslation()

  const go = (route: AppRoute) => {
    navigate(route)
    onNavigate?.()
  }

  return (
    <div className="shell-sidebar">
      <header className="shell-sidebar-brand">
        <div className="shell-sidebar-mark" aria-hidden>
          A
        </div>
        <div className="shell-sidebar-brand-text">
          <p className="shell-sidebar-title">{t('common.brandName')}</p>
          {planLabel ? <span className="shell-sidebar-plan">{planLabel}</span> : null}
        </div>
      </header>

      <nav className="shell-sidebar-nav" aria-label={t('nav.navigationGroup')}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className="shell-sidebar-section">
            <p className="shell-sidebar-section-label">{t(section.labelKey)}</p>
            {section.items.map((item) => (
              <SidebarNavLink
                key={item.id}
                item={item}
                active={activeNav === item.id}
                trackerTotal={trackerTotal}
                discoverMatchCount={discoverMatchCount}
                label={t(NAV_LABEL_KEYS[item.id])}
                onClick={() => go(item.route)}
              />
            ))}
          </div>
        ))}
      </nav>

      <footer className="shell-sidebar-footer">
        <div className="shell-sidebar-footer-divider" aria-hidden />
        <div className="shell-sidebar-user">
          <div className="shell-sidebar-avatar" aria-hidden>
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="shell-sidebar-user-meta">
            <p className="shell-sidebar-user-email">{email}</p>
            <p className="shell-sidebar-user-role">{t('common.accountPersonal')}</p>
          </div>
        </div>
        <div className="shell-sidebar-actions">
          <LanguageSwitcher />
          <button type="button" className="shell-sidebar-logout" onClick={onLogout}>
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            {t('nav.logout')}
          </button>
        </div>
      </footer>
    </div>
  )
}

export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items)
