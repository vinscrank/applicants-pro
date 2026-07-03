import type { ReactNode } from 'react'
import {
  BarChart3,
  Briefcase,
  Compass,
  FolderOpen,
  LayoutDashboard,
  UserCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navigate, type AppRoute } from '@/router'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'

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
}

const NAV_LABEL_KEYS: Record<ShellNavId, string> = {
  today: 'nav.today',
  applications: 'nav.applications',
  discover: 'nav.discover',
  progress: 'nav.progress',
  resources: 'nav.resources',
  account: 'nav.account',
}

const NAV_ITEMS: NavItem[] = [
  { id: 'today', icon: <LayoutDashboard className="h-4 w-4" />, route: { page: 'dashboard' } },
  { id: 'applications', icon: <Briefcase className="h-4 w-4" />, route: { page: 'candidature' } },
  { id: 'discover', icon: <Compass className="h-4 w-4" />, route: { page: 'discover' } },
  { id: 'progress', icon: <BarChart3 className="h-4 w-4" />, route: { page: 'progress' } },
  { id: 'resources', icon: <FolderOpen className="h-4 w-4" />, route: { page: 'documents' } },
  { id: 'account', icon: <UserCircle className="h-4 w-4" />, route: { page: 'account' } },
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
  onLogout: () => void
  onNavigate?: () => void
}

export function AppShellSidebar({
  activeNav,
  email,
  planLabel,
  trackerTotal = 0,
  onLogout,
  onNavigate,
}: AppShellSidebarProps) {
  const { t } = useTranslation()

  const go = (route: AppRoute) => {
    navigate(route)
    onNavigate?.()
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-sidebar px-3 py-4 text-sidebar-foreground lg:min-h-0">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          C
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold tracking-tight">
            {t('common.brandName')}
          </p>
          {planLabel ? (
            <Badge variant="secondary" className="mt-0.5 h-5 border-0 bg-sidebar-accent px-1.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/80">
              {planLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = activeNav === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.route)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              {item.icon}
              <span className="truncate">{t(NAV_LABEL_KEYS[item.id])}</span>
              {item.id === 'applications' && trackerTotal > 0 ? (
                <span
                  className={cn(
                    'ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-sidebar-accent text-sidebar-foreground',
                  )}
                >
                  {trackerTotal}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <Separator className="bg-sidebar-border" />
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sm font-semibold">
            {email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{email}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{t('common.accountPersonal')}</p>
          </div>
        </div>
        <LanguageSwitcher />
        <Button
          variant="outline"
          size="sm"
          className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={onLogout}
        >
          {t('nav.logout')}
        </Button>
      </div>
    </div>
  )
}

export { NAV_ITEMS }
