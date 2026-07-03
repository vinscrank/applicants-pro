import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import type { Application, StatusType } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getApplicationsColumns, type ApplicationsTableMeta } from './applications-columns'
import { DataTablePagination } from '@/components/patterns/DataTableShell'

const PAGE_SIZE = 25

interface Props {
  applications: Application[]
  updatingId: number | null
  highlightApplicationId?: number | null
  onHighlightDone?: () => void
  onStatusChange: (id: number, status: StatusType) => void
  onEdit: (app: Application) => void
  onDelete: (id: number) => void
}

export function ApplicationsDataTable({
  applications,
  updatingId,
  highlightApplicationId,
  onHighlightDone,
  onStatusChange,
  onEdit,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'applied_at', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })
  const columns = useMemo(() => getApplicationsColumns(t), [t])

  const meta: ApplicationsTableMeta = useMemo(
    () => ({ updatingId, onStatusChange, onEdit, onDelete }),
    [updatingId, onStatusChange, onEdit, onDelete]
  )

  const table = useReactTable({
    data: applications,
    columns,
    meta,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageRows = table.getRowModel().rows

  useEffect(() => {
    if (!highlightApplicationId || applications.length === 0) return
    const rowIndex = table
      .getSortedRowModel()
      .rows.findIndex((row) => row.original.id === highlightApplicationId)
    if (rowIndex < 0) return
    const targetPage = Math.floor(rowIndex / PAGE_SIZE)
    setPagination((prev) => (prev.pageIndex === targetPage ? prev : { ...prev, pageIndex: targetPage }))
  }, [highlightApplicationId, applications, sorting, table])

  useEffect(() => {
    if (!highlightApplicationId) return
    const onCurrentPage = pageRows.some((row) => row.original.id === highlightApplicationId)
    if (!onCurrentPage) return

    let cancelled = false
    let attempts = 0

    const tryScroll = () => {
      if (cancelled) return
      const el = document.getElementById(`application-row-${highlightApplicationId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      if (attempts < 24) {
        attempts += 1
        requestAnimationFrame(tryScroll)
      }
    }

    tryScroll()
    const timer = window.setTimeout(() => onHighlightDone?.(), 6000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [highlightApplicationId, pageRows, pagination.pageIndex, onHighlightDone])

  const { pageIndex, pageSize } = pagination
  const total = applications.length
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="space-y-3">
      <div className="platform-table-shell">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  id={`application-row-${row.original.id}`}
                  className={cn(highlightApplicationId === row.original.id && 'is-highlighted')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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

      {total > PAGE_SIZE && (
        <DataTablePagination
          pageIndex={pageIndex}
          pageCount={table.getPageCount()}
          onPrevious={() => table.previousPage()}
          onNext={() => table.nextPage()}
          previousLabel={t('common.previous')}
          nextLabel={t('common.next')}
          summary={`${rangeStart}–${rangeEnd} ${t('common.of')} ${total}`}
        />
      )}
    </div>
  )
}
