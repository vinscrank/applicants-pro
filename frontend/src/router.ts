import type { QuickFilter } from '@/applications/application-filters'
import { appNavigate } from '@/lib/navigation'

export type ResourcesTab = 'documents' | 'contacts'
export type CandidatureViewMode = 'table' | 'pipeline' | 'calendar'
export type DiscoverTab = 'search' | 'url' | 'careers' | 'companies'
export type AccountTab = 'profile' | 'billing'

export type AppRoute =
  | { page: 'landing' }
  | { page: 'pricing' }
  | { page: 'login' }
  | { page: 'register' }
  | { page: 'forgot-password' }
  | { page: 'reset-password'; token: string }
  | { page: 'companion' }
  | { page: 'dashboard' }
  | {
      page: 'candidature'
      highlightApplicationId?: number
      sourceFilter?: 'offerte_live'
      view?: CandidatureViewMode
      quickFilter?: QuickFilter
    }
  | { page: 'application'; applicationId: number }
  | { page: 'documents'; resourcesTab?: ResourcesTab }
  | {
      page: 'discover'
      tab?: DiscoverTab
      highlightOfferId?: string
      statusFilter?: 'applied'
      trackerApplicationId?: number
      analyzeUrl?: string
      sourceOfferId?: string
      autoAnalyze?: boolean
    }
  | { page: 'progress' }
  | { page: 'account'; accountTab?: AccountTab }

const LEGACY_PAGES = new Set([
  'pipeline',
  'interviews',
  'contacts',
  'analytics',
  'activity',
  'offerte',
  'annuncio',
  'companies',
  'careers-recent',
  'profile',
  'billing',
  'assistant',
])

export function resolveLegacyRoute(page: string, query: URLSearchParams): AppRoute | null {
  switch (page) {
    case 'pipeline':
      return { page: 'candidature', view: 'pipeline' }
    case 'interviews':
      return { page: 'candidature', quickFilter: 'interview' }
    case 'contacts':
      return { page: 'documents', resourcesTab: 'contacts' }
    case 'analytics':
      return { page: 'progress' }
    case 'activity':
      return { page: 'dashboard' }
    case 'profile':
      return { page: 'account', accountTab: 'profile' }
    case 'billing':
      return { page: 'account', accountTab: 'billing' }
    case 'assistant':
      return { page: 'account', accountTab: 'profile' }
    case 'companies':
      return { page: 'discover', tab: 'companies' }
    case 'careers-recent':
      return { page: 'discover', tab: 'careers' }
    case 'offerte': {
      const route: Extract<AppRoute, { page: 'discover' }> = { page: 'discover', tab: 'search' }
      const offerId = query.get('offer')
      if (offerId) route.highlightOfferId = offerId
      if (query.get('filter') === 'applied') route.statusFilter = 'applied'
      const appId = query.get('app')
      if (appId && /^\d+$/.test(appId)) route.trackerApplicationId = Number(appId)
      return route
    }
    case 'annuncio': {
      const route: Extract<AppRoute, { page: 'discover' }> = { page: 'discover', tab: 'url' }
      const analyzeUrl = query.get('url')
      if (analyzeUrl) route.analyzeUrl = analyzeUrl
      const offerId = query.get('offer')
      if (offerId) route.sourceOfferId = offerId
      if (query.get('auto') === '1') route.autoAnalyze = true
      return route
    }
    default:
      return null
  }
}

export function isLegacyPage(page: string): boolean {
  return LEGACY_PAGES.has(page)
}

const AUTH_PAGES = new Set(['login', 'register', 'forgot-password', 'reset-password'])
const PUBLIC_PAGES = new Set(['landing', 'pricing', 'login', 'register', 'forgot-password', 'reset-password'])
const APP_PAGES = new Set([
  'dashboard',
  'candidature',
  'application',
  'documents',
  'discover',
  'progress',
  'account',
  'companion',
])

function parseQuery(queryString: string | undefined): URLSearchParams {
  return new URLSearchParams(queryString || '')
}

function parseDiscoverTab(tab: string | null): DiscoverTab {
  if (tab === 'url' || tab === 'careers' || tab === 'companies' || tab === 'search') return tab
  return 'search'
}

function parseAccountTab(tab: string | null): AccountTab {
  if (tab === 'billing' || tab === 'profile') return tab
  if (tab === 'assistant') return 'profile'
  return 'profile'
}

function parseCandidatureView(view: string | null): CandidatureViewMode | undefined {
  if (view === 'pipeline' || view === 'kanban') return 'pipeline'
  if (view === 'calendar') return 'calendar'
  if (view === 'table') return 'table'
  return undefined
}

function parseRouteCore(page: string, query: URLSearchParams, pathname?: string): AppRoute {

  if (page === 'reset-password') {
    const token = query.get('token') || ''
    return { page: 'reset-password', token }
  }

  if (page === 'landing') return { page: 'landing' }
  if (page === 'pricing') return { page: 'pricing' }
  if (page === 'login') return { page: 'login' }
  if (page === 'register') return { page: 'register' }
  if (page === 'forgot-password') return { page: 'forgot-password' }
  if (page === 'companion') return { page: 'companion' }
  if (page === 'dashboard') return { page: 'dashboard' }

  const legacy = resolveLegacyRoute(page, query)
  if (legacy) return legacy

  if (page === 'application') {
    const appId = query.get('id')
    if (appId && /^\d+$/.test(appId)) {
      return { page: 'application', applicationId: Number(appId) }
    }
    return { page: 'candidature' }
  }

  if (page === 'discover') {
    const route: Extract<AppRoute, { page: 'discover' }> = {
      page: 'discover',
      tab: parseDiscoverTab(query.get('tab')),
    }
    const offerId = query.get('offer')
    if (offerId) route.highlightOfferId = offerId
    if (query.get('filter') === 'applied') route.statusFilter = 'applied'
    const appId = query.get('app')
    if (appId && /^\d+$/.test(appId)) route.trackerApplicationId = Number(appId)
    const analyzeUrl = query.get('url')
    if (analyzeUrl) route.analyzeUrl = analyzeUrl
    const sourceOfferId = query.get('offer')
    if (sourceOfferId) route.sourceOfferId = sourceOfferId
    if (query.get('auto') === '1') route.autoAnalyze = true
    return route
  }

  if (page === 'progress') return { page: 'progress' }

  if (page === 'account') {
    return { page: 'account', accountTab: parseAccountTab(query.get('tab')) }
  }

  if (page === 'documents') {
    const tab = query.get('tab')
    if (tab === 'companies') {
      return { page: 'discover', tab: 'companies' }
    }
    const route: Extract<AppRoute, { page: 'documents' }> = { page: 'documents' }
    if (tab === 'contacts' || tab === 'documents') {
      route.resourcesTab = tab
    }
    return route
  }

  if (page === 'candidature' || !page) {
    const route: Extract<AppRoute, { page: 'candidature' }> = { page: 'candidature' }
    const appId = query.get('app')
    if (appId && /^\d+$/.test(appId)) route.highlightApplicationId = Number(appId)
    if (query.get('source') === 'offerte_live') route.sourceFilter = 'offerte_live'
    const view = parseCandidatureView(query.get('view'))
    if (view && view !== 'table') route.view = view
    const filter = query.get('filter')
    if (
      filter === 'active' ||
      filter === 'follow_up' ||
      filter === 'interview' ||
      filter === 'offer' ||
      filter === 'archived'
    ) {
      route.quickFilter = filter
    }
    return route
  }

  if (pathname) {
    const appMatch = pathname.match(/^\/applications\/(\d+)\/?$/)
    if (appMatch) {
      return { page: 'application', applicationId: Number(appMatch[1]) }
    }
  }

  return { page: 'candidature' }
}

export function parseRouteFromUrl(pathname: string, searchParams: URLSearchParams): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { page: 'landing' }
  if (path === '/pricing') return { page: 'pricing' }
  if (path === '/login') return { page: 'login' }
  if (path === '/register') return { page: 'register' }
  if (path === '/forgot-password') return { page: 'forgot-password' }
  if (path === '/reset-password') {
    return { page: 'reset-password', token: searchParams.get('token') || '' }
  }
  if (path === '/companion') return { page: 'companion' }
  if (path === '/dashboard') return { page: 'dashboard' }
  if (path === '/progress') return { page: 'progress' }
  if (path === '/discover') {
    const route: Extract<AppRoute, { page: 'discover' }> = {
      page: 'discover',
      tab: parseDiscoverTab(searchParams.get('tab')),
    }
    const offerId = searchParams.get('offer')
    if (offerId) route.highlightOfferId = offerId
    if (searchParams.get('filter') === 'applied') route.statusFilter = 'applied'
    const appId = searchParams.get('app')
    if (appId && /^\d+$/.test(appId)) route.trackerApplicationId = Number(appId)
    const analyzeUrl = searchParams.get('url')
    if (analyzeUrl) route.analyzeUrl = analyzeUrl
    const sourceOfferId = searchParams.get('offer')
    if (sourceOfferId) route.sourceOfferId = sourceOfferId
    if (searchParams.get('auto') === '1') route.autoAnalyze = true
    return route
  }
  if (path === '/account') {
    return { page: 'account', accountTab: parseAccountTab(searchParams.get('tab')) }
  }
  if (path === '/resources') {
    const tab = searchParams.get('tab')
    if (tab === 'companies') return { page: 'discover', tab: 'companies' }
    const route: Extract<AppRoute, { page: 'documents' }> = { page: 'documents' }
    if (tab === 'contacts' || tab === 'documents') route.resourcesTab = tab
    return route
  }
  if (path === '/applications') {
    const route: Extract<AppRoute, { page: 'candidature' }> = { page: 'candidature' }
    const appId = searchParams.get('app')
    if (appId && /^\d+$/.test(appId)) route.highlightApplicationId = Number(appId)
    if (searchParams.get('source') === 'offerte_live') route.sourceFilter = 'offerte_live'
    const viewParam = searchParams.get('view')
    if (viewParam === 'pipeline' || viewParam === 'kanban') route.view = 'pipeline'
    else if (viewParam === 'calendar') route.view = 'calendar'
    else if (viewParam === 'list' || viewParam === 'table') route.view = 'table'
    const filter = searchParams.get('filter')
    if (
      filter === 'active' ||
      filter === 'follow_up' ||
      filter === 'interview' ||
      filter === 'offer' ||
      filter === 'archived'
    ) {
      route.quickFilter = filter
    }
    return route
  }
  const appMatch = path.match(/^\/applications\/(\d+)$/)
  if (appMatch) {
    return { page: 'application', applicationId: Number(appMatch[1]) }
  }
  return { page: 'landing' }
}

export function parseRouteFromHash(raw: string): AppRoute {
  const trimmed = raw.replace(/^#/, '').trim()
  if (!trimmed) return { page: 'landing' }
  const [path, queryString] = trimmed.split('?')
  const page = path.replace(/^\/+/, '') || 'landing'
  const query = parseQuery(queryString)
  return parseRouteCore(page, query)
}

export function parseRoute(): AppRoute {
  if (typeof window === 'undefined') return { page: 'landing' }
  const hash = window.location.hash.replace(/^#/, '').trim()
  if (hash) return parseRouteFromHash(hash)
  return parseRouteFromUrl(window.location.pathname, new URLSearchParams(window.location.search))
}

export function routeToPath(route: AppRoute): string {
  switch (route.page) {
    case 'landing':
      return '/'
    case 'pricing':
      return '/pricing'
    case 'login':
      return '/login'
    case 'register':
      return '/register'
    case 'forgot-password':
      return '/forgot-password'
    case 'reset-password':
      return route.token
        ? `/reset-password?token=${encodeURIComponent(route.token)}`
        : '/forgot-password'
    case 'companion':
      return '/companion'
    case 'dashboard':
      return '/dashboard'
    case 'documents': {
      const params = new URLSearchParams()
      if (route.resourcesTab && route.resourcesTab !== 'documents') {
        params.set('tab', route.resourcesTab)
      }
      const qs = params.toString()
      return qs ? `/resources?${qs}` : '/resources'
    }
    case 'discover': {
      const params = new URLSearchParams()
      if (route.tab && route.tab !== 'search') params.set('tab', route.tab)
      if (route.highlightOfferId) params.set('offer', route.highlightOfferId)
      if (route.statusFilter === 'applied') params.set('filter', 'applied')
      if (route.trackerApplicationId != null) params.set('app', String(route.trackerApplicationId))
      if (route.analyzeUrl) params.set('url', route.analyzeUrl)
      if (route.sourceOfferId) params.set('offer', route.sourceOfferId)
      if (route.autoAnalyze) params.set('auto', '1')
      const qs = params.toString()
      return qs ? `/discover?${qs}` : '/discover'
    }
    case 'progress':
      return '/progress'
    case 'account': {
      const params = new URLSearchParams()
      if (route.accountTab && route.accountTab !== 'profile') {
        params.set('tab', route.accountTab)
      }
      const qs = params.toString()
      return qs ? `/account?${qs}` : '/account'
    }
    case 'application':
      return `/applications/${route.applicationId}`
    case 'candidature': {
      const params = new URLSearchParams()
      if (route.highlightApplicationId != null) params.set('app', String(route.highlightApplicationId))
      if (route.sourceFilter === 'offerte_live') params.set('source', 'offerte_live')
      if (route.view === 'pipeline') params.set('view', 'pipeline')
      if (route.view === 'calendar') params.set('view', 'calendar')
      if (route.view === 'table') params.set('view', 'list')
      if (route.quickFilter && route.quickFilter !== 'all') params.set('filter', route.quickFilter)
      const qs = params.toString()
      return qs ? `/applications?${qs}` : '/applications'
    }
    default:
      return '/applications'
  }
}

export function routeToHash(route: AppRoute): string {
  switch (route.page) {
    case 'landing':
      return '#landing'
    case 'pricing':
      return '#pricing'
    case 'login':
      return '#login'
    case 'register':
      return '#register'
    case 'forgot-password':
      return '#forgot-password'
    case 'reset-password':
      return route.token ? `#reset-password?token=${encodeURIComponent(route.token)}` : '#forgot-password'
    case 'companion':
      return '#companion'
    case 'dashboard':
      return '#dashboard'
    case 'documents': {
      const params = new URLSearchParams()
      if (route.resourcesTab && route.resourcesTab !== 'documents') {
        params.set('tab', route.resourcesTab)
      }
      const qs = params.toString()
      return qs ? `#documents?${qs}` : '#documents'
    }
    case 'discover': {
      const params = new URLSearchParams()
      if (route.tab && route.tab !== 'search') params.set('tab', route.tab)
      if (route.highlightOfferId) params.set('offer', route.highlightOfferId)
      if (route.statusFilter === 'applied') params.set('filter', 'applied')
      if (route.trackerApplicationId != null) params.set('app', String(route.trackerApplicationId))
      if (route.analyzeUrl) params.set('url', route.analyzeUrl)
      if (route.sourceOfferId) params.set('offer', route.sourceOfferId)
      if (route.autoAnalyze) params.set('auto', '1')
      const qs = params.toString()
      return qs ? `#discover?${qs}` : '#discover'
    }
    case 'progress':
      return '#progress'
    case 'account': {
      const params = new URLSearchParams()
      if (route.accountTab && route.accountTab !== 'profile') {
        params.set('tab', route.accountTab)
      }
      const qs = params.toString()
      return qs ? `#account?${qs}` : '#account'
    }
    case 'application':
      return `#application?id=${route.applicationId}`
    case 'candidature': {
      const params = new URLSearchParams()
      if (route.highlightApplicationId != null) params.set('app', String(route.highlightApplicationId))
      if (route.sourceFilter === 'offerte_live') params.set('source', 'offerte_live')
      if (route.view === 'pipeline') params.set('view', 'pipeline')
      if (route.view === 'calendar') params.set('view', 'calendar')
      if (route.quickFilter && route.quickFilter !== 'all') params.set('filter', route.quickFilter)
      const qs = params.toString()
      return qs ? `#candidature?${qs}` : '#candidature'
    }
    default:
      return '#candidature'
  }
}

export function navigate(route: AppRoute, replace = false) {
  appNavigate(routeToPath(route), replace)
}

export function isAuthRoute(route: AppRoute): boolean {
  return AUTH_PAGES.has(route.page)
}

export function isPublicRoute(route: AppRoute): boolean {
  return PUBLIC_PAGES.has(route.page)
}

export function isAppRoute(route: AppRoute): boolean {
  return APP_PAGES.has(route.page)
}

export function isDiscoverSearchRoute(route: AppRoute): route is Extract<AppRoute, { page: 'discover' }> {
  return route.page === 'discover' && (!route.tab || route.tab === 'search')
}

export function isDiscoverUrlRoute(route: AppRoute): route is Extract<AppRoute, { page: 'discover' }> {
  return route.page === 'discover' && route.tab === 'url'
}

export function defaultAuthedRoute(profileComplete: boolean): AppRoute {
  return profileComplete ? { page: 'dashboard' } : { page: 'account', accountTab: 'profile' }
}
