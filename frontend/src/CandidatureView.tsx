import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, LayoutGrid, CalendarDays, List, Plus, Search, X, ExternalLink } from 'lucide-react'
import type { Application, ApplicationFormData, StatusType } from './types'
import { applicationToForm } from './api'
import { applicationSchema } from '@/lib/schemas/application'
import { EMPTY_FORM } from './constants'
import ApplicationForm from './components/ApplicationForm'
import { navigate, parseRoute } from './router'
import { navigateToJobs } from './pipeline/pipelineBridge'
import { useQuickAdd } from './contexts/QuickAddContext'
import { useApplicationsQuery } from './hooks/useApplicationsQuery'
import { useApplicationMutations } from './hooks/useApplicationMutations'
import {
  filterApplications,
  countByQuickFilter,
  QUICK_FILTER_IDS,
  readHideRejectedPreference,
  HIDE_REJECTED_KEY,
  type QuickFilter,
  type SourceFilter,
} from './applications/application-filters'
import { ApplicationsDataTable } from './applications/ApplicationsDataTable'
import { ApplicationsKanban } from './applications/ApplicationsKanban'
import { ApplicationsCalendar } from './applications/ApplicationsCalendar'
import { ApplicationsEmptyState } from './applications/ApplicationsEmptyState'
import { quickFilterLabel, sourceFilterLabel } from './i18n/labels'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Checkbox } from './components/ui/checkbox'
import { Label } from './components/ui/label'
import { Badge } from './components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import { cn } from './lib/utils'
import { PageLoading } from './layout/PageLayout'
import './applications/applications-page.css'

type ViewMode = 'table' | 'pipeline' | 'calendar'

export default function CandidatureView() {
  const { t } = useTranslation()
  const { openQuickAdd, bumpRefresh } = useQuickAdd()
  const { updateApplication, deleteApplication } = useApplicationMutations()
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<ApplicationFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null)
  const [hideRejected, setHideRejected] = useState(true)

  useEffect(() => {
    setHideRejected(readHideRejectedPreference())
  }, [])
  const [highlightApplicationId, setHighlightApplicationId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const includeRejected = !hideRejected || quickFilter === 'archived'
  const {
    applications,
    stats,
    loading,
    error: fetchError,
  } = useApplicationsQuery({
    excludeRejected: !includeRejected,
    includeDrafts: true,
    includeStats: true,
  })

  useEffect(() => {
    if (fetchError) setError(fetchError)
  }, [fetchError])

  const companyNameOptions = useMemo(
    () => [...new Set(applications.map((a) => a.company_name))].sort(),
    [applications],
  )

  useEffect(() => {
    const applyRouteParams = () => {
      const route = parseRoute()
      if (route.page !== 'candidature') return
      if (route.highlightApplicationId != null) {
        setHighlightApplicationId(route.highlightApplicationId)
        setViewMode('table')
        setSearch('')
        setQuickFilter('all')
        setSourceFilter('all')
        setHideRejected(false)
        localStorage.setItem(HIDE_REJECTED_KEY, 'false')
      } else {
        setHighlightApplicationId(null)
      }
      if (route.sourceFilter === 'live_jobs') {
        setSourceFilter('live_jobs')
      }
      if (route.view === 'pipeline' && route.highlightApplicationId == null) {
        setViewMode('pipeline')
      }
      if (route.view === 'calendar' && route.highlightApplicationId == null) {
        setViewMode('calendar')
      }
      if (route.quickFilter) {
        setQuickFilter(route.quickFilter)
      }
    }
    applyRouteParams()
    window.addEventListener('hashchange', applyRouteParams)
    return () => window.removeEventListener('hashchange', applyRouteParams)
  }, [])

  useEffect(() => {
    if (!highlightApplicationId || loading) return
    const target = applications.find((app) => app.id === highlightApplicationId)
    if (!target) return
    const visible = filterApplications(applications, {
      sourceFilter,
      quickFilter,
      search,
    }).some((app) => app.id === highlightApplicationId)
    if (visible) return
    setSearch('')
    setQuickFilter('all')
    setSourceFilter('all')
    if (hideRejected && ['rejected', 'ghosted', 'withdrawn'].includes(target.status)) {
      setHideRejected(false)
      localStorage.setItem(HIDE_REJECTED_KEY, 'false')
    }
  }, [highlightApplicationId, loading, applications, sourceFilter, quickFilter, search, hideRejected])

  const filteredApplications = useMemo(
    () =>
      filterApplications(applications, {
        sourceFilter,
        quickFilter,
        search,
      }),
    [applications, sourceFilter, quickFilter, search]
  )

  const quickFilterCounts = useMemo(() => {
    const base = filterApplications(applications, {
      sourceFilter,
      quickFilter: 'all',
      search: '',
    })
    const counts = Object.fromEntries(
      QUICK_FILTER_IDS.map((id) => [id, countByQuickFilter(base, id)])
    ) as Record<QuickFilter, number>

    if (hideRejected && stats?.by_status) {
      counts.archived =
        (stats.by_status.rejected ?? 0) +
        (stats.by_status.ghosted ?? 0) +
        (stats.by_status.withdrawn ?? 0)
    }

    return counts
  }, [applications, sourceFilter, hideRejected, stats])

  const sourceCounts = useMemo(
    () => ({
      all: applications.length,
      live_jobs: applications.filter((app) => app.application_source === 'live_jobs').length,
      manual: applications.filter((app) => app.application_source === 'manual').length,
    }),
    [applications]
  )

  const handleHideRejectedChange = (checked: boolean) => {
    setHideRejected(checked)
    localStorage.setItem(HIDE_REJECTED_KEY, String(checked))
    if (checked && quickFilter === 'archived') {
      setQuickFilter('all')
    }
  }

  const handleQuickFilterChange = (filter: QuickFilter) => {
    setQuickFilter(filter)
    if (filter === 'archived') {
      setHideRejected(false)
      localStorage.setItem(HIDE_REJECTED_KEY, 'false')
    }
  }

  const openEdit = (app: Application) => {
    setEditingId(app.id)
    setFormData(applicationToForm(app))
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
  }

  const jobUrl = formData.job_url?.trim() ?? ''
  const canOpenExternal = /^https?:\/\//i.test(jobUrl)

  const openExternalPage = () => {
    if (!canOpenExternal) return
    window.open(jobUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSave = async () => {
    const parsed = applicationSchema.safeParse(formData)
    if (!parsed.success) {
      setError(t('errors.requiredFields'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await updateApplication(editingId, formData)
      }
      closeModal()
      bumpRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.genericSave'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('errors.deleteConfirm'))) return
    try {
      await deleteApplication(id)
      bumpRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.genericDelete'))
    }
  }

  const handleStatusChange = async (id: number, status: StatusType) => {
    const previous = applications.find((a) => a.id === id)
    if (!previous || previous.status === status) return

    setUpdatingStatusId(id)
    setError(null)

    try {
      const payload: Partial<ApplicationFormData> = { status }
      if (status === 'applied' && previous.status !== 'applied') {
        payload.last_applied_at = new Date().toISOString()
      }
      await updateApplication(id, payload)
      bumpRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.statusUpdateFailed'))
    } finally {
      setUpdatingStatusId(null)
    }
  }

  const resetFilters = () => {
    setSearch('')
    setQuickFilter('all')
    setSourceFilter('all')
  }

  const activeFiltersCount = hideRejected ? 1 : 0

  const heroDescription = stats
    ? t('candidature.statsTotal', { total: stats.total }) +
      (stats.applied_today > 0 ? t('candidature.statsToday', { count: stats.applied_today }) : '')
    : t('common.loading')

  const viewModes: { id: ViewMode; icon: typeof List; labelKey: string }[] = [
    { id: 'table', icon: List, labelKey: 'candidature.views.list' },
    { id: 'pipeline', icon: LayoutGrid, labelKey: 'candidature.views.pipeline' },
    { id: 'calendar', icon: CalendarDays, labelKey: 'candidature.views.calendar' },
  ]

  return (
    <div className="apps-page">
      <header className="apps-hero">
        <div className="apps-hero-copy">
          <h1 className="apps-hero-title">{t('candidature.title')}</h1>
          <p className="apps-hero-description">{t('candidature.pageLead')}</p>
          {!loading && stats ? (
            <p className="apps-hero-description">{heroDescription}</p>
          ) : null}
        </div>
        <div className="apps-hero-actions">
          <Button variant="outline" onClick={() => navigateToJobs()}>
            <Search className="h-4 w-4" />
            {t('nav.searchOffers')}
          </Button>
          <Button onClick={openQuickAdd}>
            <Plus className="h-4 w-4" />
            {t('common.new')}
          </Button>
        </div>
      </header>

      <div className="apps-kpi-grid">
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('candidature.kpiTotal')}</p>
          <p className="apps-kpi-value">{stats?.total ?? applications.length}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('candidature.kpiActive')}</p>
          <p className="apps-kpi-value">{quickFilterCounts.active}</p>
          <p className="apps-kpi-hint">{t('candidature.kpiActiveHint')}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('candidature.kpiInterviews')}</p>
          <p className="apps-kpi-value">{quickFilterCounts.interview}</p>
          <p className="apps-kpi-hint">{t('candidature.kpiInterviewsHint')}</p>
        </div>
        <div className="apps-kpi-card">
          <p className="apps-kpi-label">{t('candidature.kpiAppliedToday')}</p>
          <p className="apps-kpi-value">{stats?.applied_today ?? 0}</p>
          <p className="apps-kpi-hint">{t('candidature.kpiAppliedTodayHint')}</p>
        </div>
      </div>

      <div className="apps-control-panel">
        <div className="apps-quick-filters" role="tablist" aria-label={t('common.filters')}>
          {QUICK_FILTER_IDS.map((filterId) => {
            const count = quickFilterCounts[filterId]
            const active = quickFilter === filterId
            return (
              <button
                key={filterId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleQuickFilterChange(filterId)}
                className={cn('apps-filter-chip', active && 'active')}
              >
                {quickFilterLabel(filterId)}
                <span className="apps-filter-chip-count">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="apps-toolbar">
          <div className="apps-search-wrap">
            <Search className="apps-search-icon" strokeWidth={1.75} />
            <Input
              className="apps-search-input"
              placeholder={t('candidature.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="apps-search-clear h-7 w-7"
                onClick={() => setSearch('')}
                aria-label={t('common.clearSearch')}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="apps-toolbar-actions">
            <div className="apps-source-tabs" role="tablist" aria-label={t('candidature.trackerSource.ariaLabel')}>
              {(
                [
                  { id: 'all' as const, count: undefined },
                  { id: 'live_jobs' as const, count: sourceCounts.live_jobs },
                  { id: 'manual' as const, count: sourceCounts.manual },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={sourceFilter === tab.id}
                  className={cn('apps-source-tab', sourceFilter === tab.id && 'active')}
                  onClick={() => {
                    setSourceFilter(tab.id)
                    navigate({ page: 'candidature', sourceFilter: tab.id === 'live_jobs' ? 'live_jobs' : undefined })
                  }}
                >
                  {sourceFilterLabel(tab.id)}
                  {tab.count != null && tab.count > 0 ? (
                    <span className="ml-1 opacity-70">{tab.count}</span>
                  ) : null}
                </button>
              ))}
            </div>

            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              {t('common.filters')}
              {activeFiltersCount > 0 ? (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {activeFiltersCount}
                </Badge>
              ) : null}
            </Button>

            <div className="apps-view-switch" role="tablist" aria-label={t('candidature.title')}>
              {viewModes.map(({ id, icon: Icon, labelKey }) => {
                const active = viewMode === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cn('apps-view-btn', active && 'active')}
                    onClick={() => {
                      setViewMode(id)
                      navigate({
                        page: 'candidature',
                        view: id === 'table' ? undefined : id,
                        quickFilter: quickFilter === 'all' ? undefined : quickFilter,
                      })
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                    <span className="hidden sm:inline">{t(labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="apps-filters-panel">
            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-rejected"
                checked={hideRejected}
                onCheckedChange={(checked) => handleHideRejectedChange(checked === true)}
              />
              <Label htmlFor="hide-rejected" className="text-sm font-normal cursor-pointer">
                {t('candidature.hideRejected')}
              </Label>
            </div>
          </div>
        ) : null}
      </div>

      <section className="apps-content-panel">
        {error ? <div className="apps-alert" role="alert">{error}</div> : null}

        {loading ? (
          <PageLoading />
        ) : applications.length === 0 ? (
          <ApplicationsEmptyState onAdd={openQuickAdd} />
        ) : filteredApplications.length === 0 ? (
          <div className="apps-empty">
            <div className="apps-empty-icon">
              <Search className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h3 className="apps-empty-title">{t('common.noResults')}</h3>
            <p className="apps-empty-description">{t('common.tryAdjustFilters')}</p>
            <Button variant="outline" className="mt-6" onClick={resetFilters}>
              {t('common.resetFilters')}
            </Button>
          </div>
        ) : (
          <>
            <div className="apps-content-meta">
              <p className="apps-content-count">
                {t('candidature.count', { count: filteredApplications.length })}
              </p>
            </div>

            {viewMode === 'table' ? (
              <ApplicationsDataTable
                applications={filteredApplications}
                updatingId={updatingStatusId}
                highlightApplicationId={highlightApplicationId}
                onHighlightDone={() => setHighlightApplicationId(null)}
                onStatusChange={handleStatusChange}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ) : viewMode === 'pipeline' ? (
              <ApplicationsKanban applications={filteredApplications} onStatusChange={handleStatusChange} />
            ) : (
              <ApplicationsCalendar applications={filteredApplications} />
            )}
          </>
        )}
      </section>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent
          className="platform-form-dialog platform-form-dialog--application max-w-2xl grid-rows-[auto_1fr_auto] gap-0 p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader className="platform-form-dialog__header">
            <DialogTitle className="platform-form-dialog__title">{t('candidature.editTitle')}</DialogTitle>
            {formData.company_name || formData.job_title ? (
              <DialogDescription className="platform-form-dialog__subtitle">
                {t('candidature.form.editSubtitle', {
                  company: formData.company_name || t('candidature.quickAdd.companyUnknown'),
                  role: formData.job_title || t('candidature.quickAdd.roleUnknown'),
                })}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="platform-form-dialog__body">
            <ApplicationForm
              key={editingId ?? 'new'}
              data={formData}
              onChange={setFormData}
              companyNames={companyNameOptions}
              isNew={false}
            />
          </div>
          <DialogFooter className="platform-form-dialog__footer platform-form-dialog__footer-split">
            <Button
              type="button"
              variant="outline"
              onClick={openExternalPage}
              disabled={!canOpenExternal}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t('candidature.form.openExternalPage')}
            </Button>
            <div className="platform-form-dialog__footer-actions">
              <Button variant="outline" onClick={closeModal}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
