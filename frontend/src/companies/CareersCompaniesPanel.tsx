import { useCallback, useMemo, useState } from 'react'
import {
  ExternalLink,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Radar,
  Search,
  Star,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { jobsFetch } from '@/jobs/api'
import type {
  Company,
  CompanyCreateRequest,
  CompanyScanResult,
  CompanyScanWindow,
  CompanyUpdateRequest,
  DiscoveryResult,
  JobOffer,
  RecentCareersOfferRow,
} from '@/jobs/types'
import { CareersOffersTable } from '@/careers-recent/CareersOffersTable'
import { filterCareersOffers } from '@/careers-recent/filterCareersOffers'
import {
  careersOfferRowKey,
  careersOfferToJobOffer,
  dismissCareersOffer,
  trackCareersOffer,
} from '@/careers-recent/trackCareersOffer'
import { DuplicateApplicationModal } from '@/components/DuplicateApplicationModal'
import { OfferApplyModal } from '@/jobs/components/OfferApplyModal'
import { registerApplyTarget } from '@/apply/extensionBridge'
import type { ApplicationTrackerMatch } from '@/applications/trackerMatch'
import { navigateToTracker } from '@/pipeline/pipelineBridge'
import '@/careers-recent/recent-careers.css'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import './careers-companies.css'

const ATS_OPTIONS = ['greenhouse', 'lever', 'workable', 'ashby', 'website'] as const

function compareCompanies(a: Company, b: Company, locale: string): number {
  const pa = a.priority ? 1 : 0
  const pb = b.priority ? 1 : 0
  if (pa !== pb) return pb - pa
  return a.name.localeCompare(b.name, locale)
}

interface Props {
  companies: Company[]
  onRefresh: () => void
  discovering: boolean
  onDiscoveringChange: (v: boolean) => void
  onError: (msg: string | null) => void
  onSuccess: (msg: string) => void
  onLlmRefresh?: () => void
  discoverCompanyEnabled: boolean
  autoDiscoverEnabled: boolean
}

function careersLabel(company: Company): string {
  if (company.careers_url?.trim()) return company.careers_url
  if (company.ats === 'website') return '—'
  return `${company.ats} / ${company.slug}`
}

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatPostedAt(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function scanResultsToOffers(scanResults: Record<number, CompanyScanResult>): RecentCareersOfferRow[] {
  const rows: RecentCareersOfferRow[] = []
  for (const scan of Object.values(scanResults)) {
    for (const offer of scan.recent_offers) {
      rows.push({
        company_id: scan.company_id,
        company_name: scan.company_name,
        role: offer.role,
        posted_at: offer.posted_at,
        apply_url: offer.apply_url,
        location: offer.location,
        source: offer.source,
      })
    }
  }
  rows.sort((a, b) => {
    const da = a.posted_at ? new Date(a.posted_at).getTime() : 0
    const db = b.posted_at ? new Date(b.posted_at).getTime() : 0
    return db - da
  })
  return rows
}

function emptyForm(): CompanyCreateRequest {
  return {
    name: '',
    ats: 'greenhouse',
    slug: '',
    careers_url: '',
    active: true,
    priority: false,
  }
}

export function CareersCompaniesPanel({
  companies,
  onRefresh,
  discovering,
  onDiscoveringChange,
  onError,
  onSuccess,
  onLlmRefresh,
  discoverCompanyEnabled,
  autoDiscoverEnabled,
}: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('it') ? 'it-IT' : 'en-US'

  const [filterQuery, setFilterQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [scanWindow, setScanWindow] = useState<CompanyScanWindow>('7d')
  const [scanningId, setScanningId] = useState<number | null>(null)
  const [scanningBulk, setScanningBulk] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [scanResults, setScanResults] = useState<Record<number, CompanyScanResult>>({})
  const [panelStatus, setPanelStatus] = useState<string | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [addTab, setAddTab] = useState<'manual' | 'url' | 'name'>('manual')
  const [manualForm, setManualForm] = useState<CompanyCreateRequest>(emptyForm)
  const [savingManual, setSavingManual] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlName, setUrlName] = useState('')
  const [nameInput, setNameInput] = useState('')

  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [editForm, setEditForm] = useState<CompanyUpdateRequest>({})
  const [savingEdit, setSavingEdit] = useState(false)

  const [detailCompany, setDetailCompany] = useState<Company | null>(null)

  const [trackedByKey, setTrackedByKey] = useState<Record<string, number>>({})
  const [trackingKey, setTrackingKey] = useState<string | null>(null)
  const [duplicateMatch, setDuplicateMatch] = useState<ApplicationTrackerMatch | null>(null)
  const [duplicateOpen, setDuplicateOpen] = useState(false)
  const [pendingOffer, setPendingOffer] = useState<RecentCareersOfferRow | null>(null)
  const [trackSaving, setTrackSaving] = useState(false)
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => new Set())
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyModalCareersOffer, setApplyModalCareersOffer] = useState<RecentCareersOfferRow | null>(null)
  const [applyModalOffer, setApplyModalOffer] = useState<JobOffer | null>(null)
  const [applyModalLoading, setApplyModalLoading] = useState(false)
  const [offersModalOpen, setOffersModalOpen] = useState(false)
  const [offersRoleQuery, setOffersRoleQuery] = useState('')
  const [offersLocationQuery, setOffersLocationQuery] = useState('')
  const [togglingPriorityId, setTogglingPriorityId] = useState<number | null>(null)

  const filteredCompanies = useMemo(() => {
    const q = filterQuery.trim().toLowerCase()
    return [...companies]
      .filter((c) => showInactive || c.active)
      .filter((c) => {
        if (!q) return true
        return (
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.ats.toLowerCase().includes(q) ||
          c.careers_url.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => compareCompanies(a, b, locale))
  }, [companies, filterQuery, showInactive, locale])

  const scannableCompanies = useMemo(
    () =>
      companies
        .filter((c) => c.id != null && c.active)
        .sort((a, b) => compareCompanies(a, b, locale)),
    [companies, locale],
  )

  const selectableVisible = useMemo(
    () => filteredCompanies.filter((c) => c.id != null && c.active),
    [filteredCompanies],
  )

  const pickerCompanies = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return scannableCompanies
    return scannableCompanies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.ats.toLowerCase().includes(q),
    )
  }, [scannableCompanies, pickerQuery])

  const allVisibleSelected =
    selectableVisible.length > 0 &&
    selectableVisible.every((c) => selectedIds.has(c.id!))
  const someVisibleSelected = selectableVisible.some((c) => selectedIds.has(c.id!))
  const scanBusy = scanningId != null || scanningBulk
  const selectedScannableCount = scannableCompanies.filter((c) => selectedIds.has(c.id!)).length

  const scannedOffers = useMemo(() => {
    const rows = scanResultsToOffers(scanResults)
    if (!dismissedKeys.size) return rows
    return rows.filter((offer) => !dismissedKeys.has(careersOfferRowKey(offer)))
  }, [scanResults, dismissedKeys])

  const filteredScannedOffers = useMemo(
    () => filterCareersOffers(scannedOffers, offersRoleQuery, offersLocationQuery),
    [scannedOffers, offersRoleQuery, offersLocationQuery],
  )

  const offersFilterActive =
    offersRoleQuery.trim().length > 0 || offersLocationQuery.trim().length > 0

  const scannedCompaniesCount = useMemo(() => Object.keys(scanResults).length, [scanResults])
  const hasScanSession = scannedCompaniesCount > 0

  const markTracked = (offer: RecentCareersOfferRow, applicationId: number) => {
    setTrackedByKey((prev) => ({ ...prev, [careersOfferRowKey(offer)]: applicationId }))
  }

  const handleMarkApplied = async (offer: RecentCareersOfferRow, allowDuplicate = false) => {
    const key = careersOfferRowKey(offer)
    setTrackingKey(key)
    onError(null)
    try {
      const res = await trackCareersOffer(offer, { allowDuplicate })
      markTracked(offer, res.application_id)
      if (res.already_applied && res.tracker_match && !allowDuplicate) {
        setPendingOffer(offer)
        setDuplicateMatch(res.tracker_match)
        setDuplicateOpen(true)
        return
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : t('careersRecent.errors.trackFailed'))
    } finally {
      setTrackingKey(null)
    }
  }

  const handleCreateDuplicate = async () => {
    if (!pendingOffer) return
    setTrackSaving(true)
    try {
      const res = await trackCareersOffer(pendingOffer, { allowDuplicate: true })
      markTracked(pendingOffer, res.application_id)
      setDuplicateOpen(false)
      setDuplicateMatch(null)
      setPendingOffer(null)
    } catch (e) {
      onError(e instanceof Error ? e.message : t('careersRecent.errors.trackFailed'))
    } finally {
      setTrackSaving(false)
    }
  }

  const closeApplyModal = useCallback(() => {
    setApplyModalOpen(false)
    setApplyModalCareersOffer(null)
    setApplyModalOffer(null)
  }, [])

  const handleOpenApply = useCallback((offer: RecentCareersOfferRow) => {
    const applyUrl = (offer.apply_url || '').trim()
    if (!applyUrl) return
    window.open(applyUrl, '_blank')
    registerApplyTarget(applyUrl, `${offer.company_name} · ${offer.role}`)
    setApplyModalCareersOffer(offer)
    setApplyModalOffer(careersOfferToJobOffer(offer))
    setApplyModalOpen(true)
  }, [])

  const handleApplyModalMarkApplied = useCallback(async () => {
    if (!applyModalCareersOffer) return
    setApplyModalLoading(true)
    try {
      await handleMarkApplied(applyModalCareersOffer)
      closeApplyModal()
    } finally {
      setApplyModalLoading(false)
    }
  }, [applyModalCareersOffer, closeApplyModal])

  const handleApplyModalDismiss = useCallback(async () => {
    if (!applyModalCareersOffer) return
    setApplyModalLoading(true)
    onError(null)
    try {
      await dismissCareersOffer(applyModalCareersOffer)
      setDismissedKeys((prev) => new Set(prev).add(careersOfferRowKey(applyModalCareersOffer)))
      closeApplyModal()
    } catch (e) {
      onError(e instanceof Error ? e.message : t('jobs.errors.dismissFailed'))
    } finally {
      setApplyModalLoading(false)
    }
  }, [applyModalCareersOffer, closeApplyModal, t])

  const handleApplyModalReopen = useCallback(() => {
    if (!applyModalCareersOffer) return
    const applyUrl = (applyModalCareersOffer.apply_url || '').trim()
    if (!applyUrl) return
    window.open(applyUrl, '_blank')
    registerApplyTarget(applyUrl, `${applyModalCareersOffer.company_name} · ${applyModalCareersOffer.role}`)
  }, [applyModalCareersOffer])

  const toggleSelected = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const setVisibleSelection = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      selectableVisible.forEach((c) => {
        if (checked) next.add(c.id!)
        else next.delete(c.id!)
      })
      return next
    })
  }

  const setPickerSelection = (ids: number[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => {
        if (checked) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const resetAddDialog = () => {
    setManualForm(emptyForm())
    setUrlInput('')
    setUrlName('')
    setNameInput('')
    setAddTab('manual')
  }

  const openEdit = (company: Company) => {
    setEditCompany(company)
    setEditForm({
      name: company.name,
      ats: company.ats,
      slug: company.slug,
      careers_url: company.careers_url,
      active: company.active,
      priority: company.priority ?? false,
    })
  }

  const togglePriority = async (company: Company) => {
    if (!company.id) return
    setTogglingPriorityId(company.id)
    onError(null)
    try {
      await jobsFetch<Company>(`/api/jobs/companies/${company.id}`, {
        method: 'PUT',
        body: JSON.stringify({ priority: !(company.priority ?? false) }),
      })
      await onRefresh()
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.generic'))
    } finally {
      setTogglingPriorityId(null)
    }
  }

  const autoDiscover = async () => {
    if (!autoDiscoverEnabled) {
      onError(t('companies.careers.autoDiscoverHint'))
      return
    }
    if (!window.confirm(t('companies.careers.autoDiscoverConfirm'))) return
    onDiscoveringChange(true)
    onError(null)
    setPanelStatus(t('companies.careers.autoDiscoverScanning'))
    try {
      const data = await jobsFetch<DiscoveryResult>('/api/jobs/companies/auto-discover', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      await onRefresh()
      const msg = t('companies.careers.successAutoDiscover', {
        added: data.added,
        skipped: data.skipped,
        failed: data.failed_count,
        scanned: data.scanned,
      })
      setPanelStatus(msg)
      onSuccess(msg)
      onLlmRefresh?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('companies.careers.errors.generic')
      setPanelStatus(msg)
      onError(msg)
    } finally {
      onDiscoveringChange(false)
    }
  }

  const discoverUrl = async () => {
    if (!urlInput.trim()) return
    onDiscoveringChange(true)
    onError(null)
    try {
      const data = await jobsFetch<Company>('/api/jobs/companies/discover-url', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput.trim(), name: urlName.trim() }),
      })
      resetAddDialog()
      setAddOpen(false)
      await onRefresh()
      onSuccess(
        t('companies.careers.successUrlAdded', {
          name: data.name,
          ats: data.ats,
          count: data.job_count,
        }),
      )
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.generic'))
    } finally {
      onDiscoveringChange(false)
    }
  }

  const discoverName = async () => {
    if (!nameInput.trim()) return
    onDiscoveringChange(true)
    onError(null)
    try {
      const data = await jobsFetch<Company>('/api/jobs/companies/discover-name', {
        method: 'POST',
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      resetAddDialog()
      setAddOpen(false)
      await onRefresh()
      onSuccess(
        t('companies.careers.successNameFound', {
          name: data.name,
          ats: data.ats,
          count: data.job_count,
        }),
      )
      onLlmRefresh?.()
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.generic'))
    } finally {
      onDiscoveringChange(false)
    }
  }

  const saveManual = async () => {
    if (!manualForm.name.trim() || !manualForm.slug.trim()) return
    setSavingManual(true)
    onError(null)
    try {
      const data = await jobsFetch<Company>('/api/jobs/companies', {
        method: 'POST',
        body: JSON.stringify(manualForm),
      })
      resetAddDialog()
      setAddOpen(false)
      await onRefresh()
      onSuccess(t('companies.careers.successCreated', { name: data.name }))
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.generic'))
    } finally {
      setSavingManual(false)
    }
  }

  const saveEdit = async () => {
    if (!editCompany?.id) return
    setSavingEdit(true)
    onError(null)
    try {
      const data = await jobsFetch<Company>(`/api/jobs/companies/${editCompany.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      setEditCompany(null)
      await onRefresh()
      onSuccess(t('companies.careers.successUpdated', { name: data.name }))
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.generic'))
    } finally {
      setSavingEdit(false)
    }
  }

  const deactivate = async (company: Company) => {
    if (!company.id) return
    if (!window.confirm(t('companies.careers.deleteConfirm', { name: company.name }))) return
    onError(null)
    try {
      await jobsFetch(`/api/jobs/companies/${company.id}`, { method: 'DELETE' })
      if (detailCompany?.id === company.id) setDetailCompany(null)
      await onRefresh()
      onSuccess(t('companies.careers.successDeleted', { name: company.name }))
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.generic'))
    }
  }

  const scanCompany = async (company: Company) => {
    if (!company.id) return
    setScanningId(company.id)
    onError(null)
    try {
      const data = await jobsFetch<CompanyScanResult>(
        `/api/jobs/companies/${company.id}/scan`,
        {
          method: 'POST',
          body: JSON.stringify({ posted_within: scanWindow }),
        },
      )
      setScanResults((prev) => ({ ...prev, [company.id!]: data }))
      await onRefresh()
      setOffersModalOpen(true)
      const period = data.posted_within_label
      onSuccess(
        data.recent_count > 0
          ? t('companies.careers.successScanRecent', {
              name: company.name,
              count: data.recent_count,
              period,
              total: data.total_jobs,
            })
          : t('companies.careers.successScanNone', {
              name: company.name,
              period,
              total: data.total_jobs,
            }),
      )
    } catch (e) {
      onError(e instanceof Error ? e.message : t('companies.careers.errors.scanFailed'))
    } finally {
      setScanningId(null)
    }
  }

  const scanSelected = async () => {
    const targets = scannableCompanies.filter((c) => selectedIds.has(c.id!))
    if (!targets.length) return
    setScanningBulk(true)
    setScanResults({})
    onError(null)
    let ok = 0
    let failed = 0
    for (let i = 0; i < targets.length; i++) {
      const company = targets[i]
      setScanningId(company.id!)
      setPanelStatus(
        t('companies.careers.scanBulkProgress', {
          current: i + 1,
          total: targets.length,
          name: company.name,
        }),
      )
      try {
        const data = await jobsFetch<CompanyScanResult>(
          `/api/jobs/companies/${company.id}/scan`,
          {
            method: 'POST',
            body: JSON.stringify({ posted_within: scanWindow }),
          },
        )
        setScanResults((prev) => ({ ...prev, [company.id!]: data }))
        ok++
      } catch {
        failed++
      }
    }
    setScanningId(null)
    setScanningBulk(false)
    setPanelStatus(null)
    await onRefresh()
    setOffersModalOpen(true)
    onSuccess(t('companies.careers.scanBulkDone', { ok, failed }))
  }

  const renderScanSummary = (companyId: number | undefined) => {
    if (companyId == null) return null
    const scan = scanResults[companyId]
    if (!scan) return null
    return (
      <div className="careers-scan-summary">
        <span className="font-medium">
          {scan.recent_count > 0
            ? t('companies.careers.scanResultRecent', {
                count: scan.recent_count,
                period: scan.posted_within_label,
              })
            : t('companies.careers.scanResultNone', { period: scan.posted_within_label })}
        </span>
        <span className="text-muted-foreground">
          {t('companies.careers.scanResultTotal', { total: scan.total_jobs })}
        </span>
      </div>
    )
  }

  return (
    <section className="careers-companies-panel">
      <div className="careers-companies-header">
        <h2 className="careers-companies-title">
          {t('companies.careers.title', { count: filteredCompanies.length })}
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)} disabled={discovering || scanBusy}>
          <Plus className="h-4 w-4" />
          {t('companies.careers.addButton')}
        </Button>
      </div>

      {(discovering || scanningBulk || panelStatus) && (
        <div className={`careers-companies-status ${discovering || scanningBulk ? 'is-loading' : ''}`}>
          {(discovering || scanningBulk) && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
          <span>
            {discovering
              ? panelStatus ?? t('companies.careers.autoDiscoverScanning')
              : scanningBulk
                ? panelStatus ?? t('companies.careers.scanning')
                : panelStatus}
          </span>
        </div>
      )}

      <div className="careers-companies-controls">
        <div className="careers-companies-controls-row">
          <div className="careers-companies-search">
            <Search className="careers-companies-search-icon" aria-hidden="true" />
            <Input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t('companies.careers.searchPlaceholder')}
              className="careers-companies-search-input"
            />
          </div>
          <label className="careers-companies-inactive-toggle">
            <Checkbox
              checked={showInactive}
              onCheckedChange={(v) => setShowInactive(v === true)}
            />
            {t('companies.careers.showInactive')}
          </label>
        </div>

        <div className="careers-companies-controls-row careers-companies-controls-actions">
          <div className="careers-companies-action-group">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              disabled={scannableCompanies.length === 0}
            >
              {t('companies.careers.selectCareers')}
            </Button>
            {selectedScannableCount > 0 && (
              <>
                <Badge variant="secondary" className="careers-selection-badge">
                  {t('companies.careers.selectedBadge', { count: selectedScannableCount })}
                </Badge>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  {t('companies.careers.clearSelection')}
                </Button>
              </>
            )}
            <div className="careers-companies-controls-divider" aria-hidden="true" />
            <Select
              value={scanWindow}
              onValueChange={(v) => setScanWindow(v as CompanyScanWindow)}
              disabled={discovering || scanBusy}
            >
              <SelectTrigger id="careers-scan-window" className="h-9 w-[9.5rem]" aria-label={t('companies.careers.scanWindow')}>
                <SelectValue placeholder={t('companies.careers.scanWindow')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">{t('companies.careers.scanWindow24h')}</SelectItem>
                <SelectItem value="7d">{t('companies.careers.scanWindow7d')}</SelectItem>
                <SelectItem value="30d">{t('companies.careers.scanWindow30d')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="default"
              size="sm"
              onClick={scanSelected}
              disabled={discovering || scanBusy || selectedScannableCount === 0}
              title={
                selectedScannableCount === 0 ? t('companies.careers.scanSelectedHint') : undefined
              }
            >
              <Radar className="h-4 w-4" />
              {scanBusy && scanningBulk
                ? t('companies.careers.scanning')
                : t('companies.careers.scanSelected')}
            </Button>
            {hasScanSession && (
              <Button variant="outline" size="sm" onClick={() => setOffersModalOpen(true)}>
                {t('companies.careers.viewOffers', { count: scannedOffers.length })}
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(!autoDiscoverEnabled && 'careers-auto-discover-off')}
            onClick={autoDiscover}
            disabled={discovering || scanBusy || !autoDiscoverEnabled}
            title={autoDiscoverEnabled ? undefined : t('companies.careers.autoDiscoverHint')}
          >
            {discovering ? t('companies.careers.autoDiscoverScanning') : autoDiscoverEnabled ? t('companies.careers.autoDiscover') : t('companies.careers.autoDiscoverOff')}
          </Button>
        </div>
      </div>

      <div className="careers-companies-table-wrap">
        {filteredCompanies.length === 0 ? (
          <p className="careers-companies-empty">
            {filterQuery.trim() ? t('companies.careers.noFilterMatch') : t('companies.careers.empty')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false
                    }
                    onCheckedChange={(v) => setVisibleSelection(v === true)}
                    disabled={selectableVisible.length === 0 || scanBusy}
                    aria-label={t('companies.careers.selectAllVisible')}
                  />
                </TableHead>
                <TableHead>{t('companies.careers.colCompany')}</TableHead>
                <TableHead>{t('companies.careers.colCareers')}</TableHead>
                <TableHead className="w-20">{t('companies.careers.colOffers')}</TableHead>
                <TableHead className="w-24">{t('companies.careers.colSource')}</TableHead>
                <TableHead className="w-28">{t('companies.careers.colAdded')}</TableHead>
                <TableHead className="w-16 text-right">{t('companies.careers.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => {
                const isScanning = scanningId === company.id
                const canSelect = company.id != null && company.active
                const isSelected = company.id != null && selectedIds.has(company.id)
                return (
                  <TableRow
                    key={company.id ?? `${company.ats}-${company.slug}`}
                    className={[
                      !company.active ? 'opacity-70' : undefined,
                      isScanning ? 'careers-row-scanning' : undefined,
                      company.priority ? 'careers-row-priority' : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(v) => {
                          if (company.id != null) toggleSelected(company.id, v === true)
                        }}
                        disabled={!canSelect || scanBusy}
                        aria-label={company.name}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-8 w-8 shrink-0 careers-priority-btn',
                            company.priority && 'is-active',
                          )}
                          disabled={!company.id || togglingPriorityId === company.id}
                          title={
                            company.priority
                              ? t('companies.careers.removePriority')
                              : t('companies.careers.togglePriority')
                          }
                          onClick={() => togglePriority(company)}
                        >
                          <Star
                            className={cn('h-4 w-4', company.priority && 'fill-current')}
                          />
                        </Button>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium">{company.name}</span>
                            {company.priority && (
                              <Badge variant="default" className="careers-priority-badge">
                                {t('companies.careers.priorityTag')}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {company.ats} · {company.slug}
                          </div>
                          {!company.active && (
                            <Badge variant="secondary" className="mt-1">
                              {t('companies.careers.inactiveBadge')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {company.careers_url ? (
                        <a
                          href={company.careers_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline break-all"
                        >
                          {company.careers_url}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">{careersLabel(company)}</span>
                      )}
                      {renderScanSummary(company.id)}
                    </TableCell>
                    <TableCell>{company.job_count}</TableCell>
                    <TableCell>{company.source}</TableCell>
                    <TableCell className="text-sm">{formatDate(company.discovered_at, locale)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="platform-portal">
                          <DropdownMenuItem onClick={() => setDetailCompany(company)}>
                            <Eye className="h-4 w-4" />
                            {t('companies.careers.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(company)}>
                            <Pencil className="h-4 w-4" />
                            {t('companies.careers.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!company.id || togglingPriorityId === company.id}
                            onClick={() => togglePriority(company)}
                          >
                            <Star className={cn('h-4 w-4', company.priority && 'fill-current')} />
                            {company.priority
                              ? t('companies.careers.removePriority')
                              : t('companies.careers.togglePriority')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!company.id || discovering || isScanning || scanBusy}
                            onClick={() => scanCompany(company)}
                          >
                            <Radar className="h-4 w-4" />
                            {isScanning ? t('companies.careers.scanning') : t('companies.careers.scan')}
                          </DropdownMenuItem>
                          {company.careers_url && (
                            <DropdownMenuItem asChild>
                              <a href={company.careers_url} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                {t('companies.careers.detailOpenCareers')}
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deactivate(company)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('companies.careers.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={offersModalOpen}
        onOpenChange={(open) => {
          setOffersModalOpen(open)
          if (!open) {
            setOffersRoleQuery('')
            setOffersLocationQuery('')
          }
        }}
      >
        <DialogContent className="careers-offers-modal platform-portal">
          <DialogHeader>
            <DialogTitle>{t('companies.careers.offersTitle')}</DialogTitle>
            <DialogDescription>
              {offersFilterActive
                ? t('companies.careers.offersSummaryFiltered', {
                    companies: scannedCompaniesCount,
                    offers: scannedOffers.length,
                    filtered: filteredScannedOffers.length,
                  })
                : t('companies.careers.offersSummary', {
                    companies: scannedCompaniesCount,
                    offers: scannedOffers.length,
                  })}
            </DialogDescription>
          </DialogHeader>
          {scannedOffers.length > 0 && (
            <div className="careers-offers-modal-filters recent-careers-filters">
              <div className="recent-careers-search">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={offersRoleQuery}
                  onChange={(e) => setOffersRoleQuery(e.target.value)}
                  placeholder={t('careersRecent.searchPlaceholder')}
                  aria-label={t('careersRecent.searchPlaceholder')}
                />
              </div>
              <div className="recent-careers-search">
                <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={offersLocationQuery}
                  onChange={(e) => setOffersLocationQuery(e.target.value)}
                  placeholder={t('careersRecent.locationPlaceholder')}
                  aria-label={t('careersRecent.locationPlaceholder')}
                />
              </div>
            </div>
          )}
          <div className="careers-offers-modal-body">
            {scannedOffers.length > 0 ? (
              filteredScannedOffers.length > 0 ? (
                <CareersOffersTable
                  offers={filteredScannedOffers}
                  locale={locale}
                  trackedByKey={trackedByKey}
                  trackingKey={trackingKey}
                  onMarkApplied={(offer) => void handleMarkApplied(offer)}
                  onOpenApply={handleOpenApply}
                  formatPostedAt={formatPostedAt}
                />
              ) : (
                <p className="careers-companies-empty">{t('companies.careers.noFilterMatch')}</p>
              )
            ) : (
              <p className="careers-companies-empty">
                {t('companies.careers.offersEmptyTitle')}: {t('companies.careers.offersEmptyDescription')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setOffersModalOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open)
          if (!open) setPickerQuery('')
        }}
      >
        <DialogContent className="max-w-md platform-portal">
          <DialogHeader>
            <DialogTitle>{t('companies.careers.selectCareersTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder={t('companies.careers.selectCareersSearch')}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPickerSelection(
                    pickerCompanies.map((c) => c.id!),
                    true,
                  )
                }
                disabled={pickerCompanies.length === 0}
              >
                {t('companies.careers.selectAllVisible')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                {t('companies.careers.clearSelection')}
              </Button>
            </div>
            <div className="careers-picker-list">
              {pickerCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('companies.careers.noFilterMatch')}</p>
              ) : (
                pickerCompanies.map((company) => (
                  <label key={company.id} className="careers-picker-item">
                    <Checkbox
                      checked={selectedIds.has(company.id!)}
                      onCheckedChange={(v) => toggleSelected(company.id!, v === true)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{company.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {company.ats} · {company.slug}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddDialog() }}>
        <DialogContent className="max-w-lg platform-portal">
          <DialogHeader>
            <DialogTitle>{t('companies.careers.formCreateTitle')}</DialogTitle>
          </DialogHeader>
          <Tabs value={addTab} onValueChange={(v) => setAddTab(v as typeof addTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">{t('companies.careers.addTabManual')}</TabsTrigger>
              <TabsTrigger value="url">{t('companies.careers.addTabUrl')}</TabsTrigger>
              <TabsTrigger value="name">{t('companies.careers.addTabName')}</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-name">{t('companies.careers.formName')}</Label>
                <Input
                  id="manual-name"
                  value={manualForm.name}
                  onChange={(e) => setManualForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-ats">{t('companies.careers.formAts')}</Label>
                  <Select
                    value={manualForm.ats}
                    onValueChange={(v) => setManualForm((f) => ({ ...f, ats: v }))}
                  >
                    <SelectTrigger id="manual-ats">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ATS_OPTIONS.map((ats) => (
                        <SelectItem key={ats} value={ats}>
                          {ats}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manual-slug">{t('companies.careers.formSlug')}</Label>
                  <Input
                    id="manual-slug"
                    value={manualForm.slug}
                    onChange={(e) => setManualForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-url">{t('companies.careers.formCareersUrl')}</Label>
                <Input
                  id="manual-url"
                  value={manualForm.careers_url}
                  onChange={(e) => setManualForm((f) => ({ ...f, careers_url: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={saveManual}
                  disabled={savingManual || !manualForm.name.trim() || !manualForm.slug.trim()}
                >
                  {savingManual ? t('companies.careers.formSaving') : t('companies.careers.formSave')}
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="url" className="mt-4 space-y-3">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t('companies.careers.addUrlPlaceholder')}
                disabled={discovering}
              />
              <Input
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder={t('companies.careers.addNameOptional')}
                disabled={discovering}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={discoverUrl} disabled={discovering || !urlInput.trim()}>
                  {t('companies.careers.addUrlButton')}
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="name" className="mt-4 space-y-3">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t('companies.careers.addNamePlaceholder')}
                disabled={discovering}
                onKeyDown={(e) => e.key === 'Enter' && !discovering && discoverName()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={discoverName}
                  disabled={discovering || !nameInput.trim() || !discoverCompanyEnabled}
                  title={discoverCompanyEnabled ? undefined : t('companies.careers.addNameOffHint')}
                >
                  {discoverCompanyEnabled ? t('companies.careers.addNameButton') : t('companies.careers.addNameOff')}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={editCompany != null} onOpenChange={(open) => !open && setEditCompany(null)}>
        <DialogContent className="max-w-lg platform-portal">
          <DialogHeader>
            <DialogTitle>{t('companies.careers.formEditTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t('companies.careers.formName')}</Label>
              <Input
                id="edit-name"
                value={editForm.name ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-ats">{t('companies.careers.formAts')}</Label>
                <Select
                  value={editForm.ats ?? 'greenhouse'}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, ats: v }))}
                >
                  <SelectTrigger id="edit-ats">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATS_OPTIONS.map((ats) => (
                      <SelectItem key={ats} value={ats}>
                        {ats}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-slug">{t('companies.careers.formSlug')}</Label>
                <Input
                  id="edit-slug"
                  value={editForm.slug ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-url">{t('companies.careers.formCareersUrl')}</Label>
              <Input
                id="edit-url"
                value={editForm.careers_url ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, careers_url: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editForm.active ?? true}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, active: v === true }))}
              />
              {t('companies.careers.formActive')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editForm.priority ?? false}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, priority: v === true }))}
              />
              {t('companies.careers.formPriority')}
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompany(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit || !editForm.name?.trim() || !editForm.slug?.trim()}
            >
              {savingEdit ? t('companies.careers.formSaving') : t('companies.careers.formSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailCompany != null} onOpenChange={(open) => !open && setDetailCompany(null)}>
        <DialogContent className="max-w-lg platform-portal">
          <DialogHeader>
            <DialogTitle>{t('companies.careers.detailTitle')}</DialogTitle>
          </DialogHeader>
          {detailCompany && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-lg font-semibold">{detailCompany.name}</p>
                <p className="text-muted-foreground">
                  {detailCompany.ats} · {detailCompany.slug}
                </p>
              </div>
              <dl className="careers-detail-grid">
                <dt>{t('companies.careers.detailId')}</dt>
                <dd>{detailCompany.id ?? '—'}</dd>
                <dt>{t('companies.careers.detailOffers')}</dt>
                <dd>{detailCompany.job_count}</dd>
                <dt>{t('companies.careers.detailSource')}</dt>
                <dd>{detailCompany.source}</dd>
                <dt>{t('companies.careers.detailAdded')}</dt>
                <dd>{formatDate(detailCompany.discovered_at, locale)}</dd>
                <dt>{t('companies.careers.detailStatus')}</dt>
                <dd>
                  {detailCompany.active
                    ? t('companies.careers.detailActive')
                    : t('companies.careers.detailInactive')}
                </dd>
                <dt>{t('companies.careers.detailPriority')}</dt>
                <dd>
                  {detailCompany.priority
                    ? t('companies.careers.detailPriorityYes')
                    : t('companies.careers.detailPriorityNo')}
                </dd>
              </dl>
              {detailCompany.careers_url && (
                <a
                  href={detailCompany.careers_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('companies.careers.detailOpenCareers')}
                </a>
              )}
              <div className="rounded-md border p-3">
                <p className="mb-2 font-medium">{t('companies.careers.detailScanResult')}</p>
                {detailCompany.id != null && scanResults[detailCompany.id] ? (
                  (() => {
                    const scan = scanResults[detailCompany.id!]
                    return (
                      <div className="space-y-1 text-muted-foreground">
                        <p>
                          {scan.recent_count > 0
                            ? t('companies.careers.detailScanRecent', {
                                count: scan.recent_count,
                                period: scan.posted_within_label,
                              })
                            : t('companies.careers.detailScanNoRecent', {
                                period: scan.posted_within_label,
                              })}
                        </p>
                        <p>{t('companies.careers.detailScanTotal', { total: scan.total_jobs })}</p>
                        {scan.unknown_date_count > 0 && (
                          <p>
                            {t('companies.careers.detailScanUnknown', {
                              count: scan.unknown_date_count,
                            })}
                          </p>
                        )}
                        {scan.recent_offers.length > 0 && (
                          <ul className="mt-2 list-disc pl-4">
                            {scan.recent_offers.slice(0, 8).map((offer) => (
                              <li key={`${offer.role}-${offer.apply_url}`}>
                                {offer.role}
                                {offer.posted_at ? ` · ${offer.posted_at.slice(0, 10)}` : ''}
                              </li>
                            ))}
                            {scan.recent_offers.length > 8 && (
                              <li>
                                {t('companies.careers.scanResultMore', {
                                  count: scan.recent_offers.length - 8,
                                })}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <p className="text-muted-foreground">{t('companies.careers.detailScanNone')}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {detailCompany && (
              <>
                <Button
                  variant="outline"
                  onClick={() => scanCompany(detailCompany)}
                  disabled={!detailCompany.id || scanningId === detailCompany.id || scanBusy}
                >
                  {scanningId === detailCompany.id
                    ? t('companies.careers.scanning')
                    : t('companies.careers.scan')}
                </Button>
                <Button variant="outline" onClick={() => { openEdit(detailCompany); setDetailCompany(null) }}>
                  {t('companies.careers.edit')}
                </Button>
              </>
            )}
            <Button onClick={() => setDetailCompany(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateApplicationModal
        open={duplicateOpen}
        match={duplicateMatch}
        mode="live"
        saving={trackSaving}
        onClose={() => {
          setDuplicateOpen(false)
          setDuplicateMatch(null)
          setPendingOffer(null)
        }}
        onOpenTracker={(applicationId) => {
          setDuplicateOpen(false)
          navigateToTracker({ applicationId })
        }}
        onCreateDuplicate={() => void handleCreateDuplicate()}
      />

      <OfferApplyModal
        open={applyModalOpen}
        offer={applyModalOffer}
        applyUrl={applyModalCareersOffer?.apply_url ?? ''}
        loading={applyModalLoading}
        onClose={closeApplyModal}
        onMarkApplied={() => void handleApplyModalMarkApplied()}
        onDismiss={() => void handleApplyModalDismiss()}
        onReopenApply={handleApplyModalReopen}
      />
    </section>
  )
}
