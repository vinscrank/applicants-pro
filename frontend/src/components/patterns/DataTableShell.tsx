import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Table as TanStackTable, flexRender } from '@tanstack/react-table'

type FlexRender = typeof flexRender

interface DataTableShellProps<TData> {
  table: TanStackTable<TData>
  flexRender: FlexRender
  emptyMessage?: string
  stickyHeader?: boolean
  className?: string
  footer?: ReactNode
  loading?: boolean
  columnCount?: number
}

export function DataTableShell<TData>({
  table,
  flexRender,
  emptyMessage,
  stickyHeader = true,
  className,
  footer,
  loading = false,
  columnCount,
}: DataTableShellProps<TData>) {
  const cols = columnCount ?? table.getAllColumns().length
  const rows = table.getRowModel().rows

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className={stickyHeader ? 'sticky top-0 z-10 bg-card' : undefined}>
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
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {Array.from({ length: cols }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
                  {emptyMessage ?? '—'}
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>
      {footer ? (
        <div className="flex flex-wrap items-center justify-between gap-2">{footer}</div>
      ) : null}
    </div>
  )
}

interface DataTablePaginationProps {
  pageIndex: number
  pageCount: number
  onPrevious: () => void
  onNext: () => void
  previousLabel: string
  nextLabel: string
  summary?: string
}

export function DataTablePagination({
  pageIndex,
  pageCount,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  summary,
}: DataTablePaginationProps) {
  return (
    <>
      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={pageIndex <= 0}>
          {previousLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={pageIndex >= pageCount - 1}>
          {nextLabel}
        </Button>
      </div>
    </>
  )
}
