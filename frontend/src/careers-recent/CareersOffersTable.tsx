import { useMemo } from 'react'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RecentCareersOfferRow } from '@/offerte/types'
import { navigateToTracker } from '@/pipeline/pipelineBridge'
import { getCareersOffersColumns, type CareersOffersTableMeta } from './careers-offers-columns'

interface Props {
  offers: RecentCareersOfferRow[]
  locale: string
  trackedByKey: Record<string, number>
  trackingKey: string | null
  onMarkApplied: (offer: RecentCareersOfferRow) => void
  onOpenApply: (offer: RecentCareersOfferRow) => void
  formatPostedAt: (value: string | null | undefined, locale: string) => string
}

export function CareersOffersTable({
  offers,
  locale,
  trackedByKey,
  trackingKey,
  onMarkApplied,
  onOpenApply,
  formatPostedAt,
}: Props) {
  const { t } = useTranslation()
  const columns = useMemo(() => getCareersOffersColumns(t), [t])

  const meta: CareersOffersTableMeta = useMemo(
    () => ({
      locale,
      trackedByKey,
      trackingKey,
      onMarkApplied,
      onOpenApply,
      onOpenTracker: (applicationId) => navigateToTracker({ applicationId }),
      formatPostedAt,
    }),
    [locale, trackedByKey, trackingKey, onMarkApplied, onOpenApply, formatPostedAt],
  )

  const table = useReactTable({
    data: offers,
    columns,
    meta,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
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
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {t('common.noResults')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
