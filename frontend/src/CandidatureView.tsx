import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Filter, LayoutGrid, CalendarDays, List, Plus, Search, X } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog'
import { cn } from './lib/utils'
import { PageLayout, PageLoading } from './layout/PageLayout'

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

  const description = stats
    ? t('candidature.statsTotal', { total: stats.total }) +
      (stats.applied_today > 0 ? t('candidature.statsToday', { count: stats.applied_today }) : '')
    : t('common.loading')

  return (
    <PageLayout
      title={t('candidature.title')}
      description={description}
      actions={
        <>
          <Button variant="outline" onClick={() => navigateToJobs()}>
            <Search className="h-4 w-4" />
            {t('nav.searchOffers')}
          </Button>
          <Button onClick={openQuickAdd}>
            <Plus className="h-4 w-4" />
            {t('common.new')}
          </Button>
        </>
      }
    >
      <div className="platform-filter-row">
        {QUICK_FILTER_IDS.map((filterId) => {
          const count = quickFilterCounts[filterId]
          const active = quickFilter === filterId
          return (
            <button
              key={filterId}
              type="button"
              onClick={() => handleQuickFilterChange(filterId)}
              className={cn('platform-filter-pill', active && 'active')}
            >
              {quickFilterLabel(filterId)}
              <span className="platform-filter-pill-count">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="platform-toolbar">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 pr-9 bg-background"
            placeholder={t('candidature.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearch('')}
              aria-label={t('common.clearSearch')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="platform-toolbar-actions">
          <div className="platform-source-tabs">
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
                className={cn('platform-source-tab', sourceFilter === tab.id && 'active')}
                onClick={() => {
                  setSourceFilter(tab.id)
                  navigate({ page: 'candidature', sourceFilter: tab.id === 'live_jobs' ? 'live_jobs' : undefined })
                }}
              >
                {sourceFilterLabel(tab.id)}
                {tab.count != null && tab.count > 0 && (
                  <span className="ml-1 opacity-70">{tab.count}</span>
                )}
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
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <Tabs
            value={viewMode}
            onValueChange={(v) => {
              const mode = v as ViewMode
              setViewMode(mode)
              navigate({
                page: 'candidature',
                view: mode === 'table' ? undefined : mode,
                quickFilter: quickFilter === 'all' ? undefined : quickFilter,
              })
            }}
          >
            <TabsList className="h-9">
              <TabsTrigger value="table" className="gap-1.5 px-2.5">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{t('candidature.views.list')}</span>
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="gap-1.5 px-2.5">
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">{t('candidature.views.pipeline')}</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 px-2.5">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{t('candidature.views.calendar')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {showFilters && (
        <div className="platform-filters-panel space-y-4">
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
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <PageLoading />
      ) : applications.length === 0 ? (
        <ApplicationsEmptyState onAdd={openQuickAdd} />
      ) : filteredApplications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t('common.noResults')}</h3>
          <p className="text-sm text-muted-foreground mt-2">{t('common.tryAdjustFilters')}</p>
          <Button variant="outline" className="mt-6" onClick={resetFilters}>
            {t('common.resetFilters')}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('candidature.count', { count: filteredApplications.length })}
          </p>

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

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="platform-form-dialog max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('candidature.editTitle')}</DialogTitle>
          </DialogHeader>
          <ApplicationForm
            data={formData}
            onChange={setFormData}
            companyNames={companyNameOptions}
            isNew={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
