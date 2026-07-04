import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table'
import type { JobOffer, Seniority } from '../types'
import { formatAppliedAt, isCompletedApplication } from '../offerApplicationStatus'
import { DataTablePagination } from '@/components/patterns/DataTableShell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getOffersColumns, offerRowClassName, type OffersTableMeta } from './offers-columns'

const PAGE_SIZE = 25

interface Props {
  offers: JobOffer[]
  paginationResetKey?: string
  highlightOfferId?: string | null
  onHighlightDone?: () => void
  onApply: (offer: JobOffer) => void
  onMarkApplied: (offer: JobOffer) => void
  onReopenApply: (offer: JobOffer) => void
  onDismiss: (offer: JobOffer) => void
  onAnalyze?: (offer: JobOffer) => void
  onRestore: (offer: JobOffer) => void
  onViewInTracker?: (applicationId: number) => void
  showDismissed?: boolean
}

export function OffersTable({
  offers,
  paginationResetKey = '',
  highlightOfferId,
  onHighlightDone,
  onApply,
  onMarkApplied,
  onReopenApply,
  onDismiss,
  onAnalyze,
  onRestore,
  onViewInTracker,
  showDismissed = false,
}: Props) {
  const { t } = useTranslation()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

  const seniorityLabels = useMemo(
    (): Record<Seniority, string> => ({
      entry: t('offerte.seniority.entry'),
      junior: t('offerte.seniority.junior'),
      mid: t('offerte.seniority.mid'),
      senior: t('offerte.seniority.senior'),
      lead: t('offerte.seniority.lead'),
      unknown: t('common.notAvailable'),
    }),
    [t],
  )

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return t('common.notAvailable')
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    } catch {
      return dateStr
    }
  }

  const columns = useMemo(() => getOffersColumns(t), [t])

  const meta: OffersTableMeta = useMemo(
    () => ({
      highlightOfferId,
      showDismissed,
      seniorityLabels,
      formatDate,
      onApply,
      onMarkApplied,
      onReopenApply,
      onDismiss,
      onAnalyze,
      onRestore,
      onViewInTracker,
    }),
    [
      highlightOfferId,
      showDismissed,
      seniorityLabels,
      onApply,
      onMarkApplied,
      onReopenApply,
      onDismiss,
      onAnalyze,
      onRestore,
      onViewInTracker,
    ],
  )

  const table = useReactTable({
    data: offers,
    columns,
    meta,
    state: { pagination },
    onPaginationChange: setPagination,
    autoResetPageIndex: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [paginationResetKey])

  useEffect(() => {
    if (!highlightOfferId) return
    const index = offers.findIndex((offer) => offer.id === highlightOfferId)
    if (index >= 0) {
      setPagination({ pageIndex: Math.floor(index / PAGE_SIZE), pageSize: PAGE_SIZE })
    }
  }, [highlightOfferId, offers])

  const pageRows = table.getRowModel().rows

  useEffect(() => {
    if (!highlightOfferId) return
    const onCurrentPage = pageRows.some((row) => row.original.id === highlightOfferId)
    if (!onCurrentPage) return
    const el = document.getElementById(`offer-row-${highlightOfferId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(() => onHighlightDone?.(), 8000)
    return () => window.clearTimeout(timer)
  }, [highlightOfferId, pageRows, pagination.pageIndex, onHighlightDone])

  if (offers.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">{t('offerte.tableEmpty')}</div>
  }

  const { pageIndex, pageSize } = pagination
  const total = offers.length
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => {
              const offer = row.original
              const completed = isCompletedApplication(offer)
              const appliedDate = formatAppliedAt(offer.applied_at)
              return (
                <TableRow
                  key={row.id}
                  id={`offer-row-${offer.id}`}
                  className={offerRowClassName(offer, highlightOfferId)}
                  title={completed && appliedDate ? t('offerte.appliedOn', { date: appliedDate }) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(cell.column.id === 'actions' && 'align-top')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {total > PAGE_SIZE ? (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={table.getPageCount()}
          onPrevious={() => table.previousPage()}
          onNext={() => table.nextPage()}
          previousLabel={t('common.previous')}
          nextLabel={t('common.next')}
          summary={`${rangeStart}–${rangeEnd} ${t('common.of')} ${total}`}
        />
      ) : null}
    </div>
  )
}
