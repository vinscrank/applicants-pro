import { useCallback, useEffect, useMemo, useState } from 'react'

export const TABLE_PAGE_SIZE = 100

export function pageForItemIndex(index: number, pageSize = TABLE_PAGE_SIZE): number {
  if (index < 0) return 1
  return Math.floor(index / pageSize) + 1
}

export function useTablePagination<T>(
  items: T[],
  options?: { pageSize?: number; resetKey?: string },
) {
  const pageSize = options?.pageSize ?? TABLE_PAGE_SIZE
  const resetKey = options?.resetKey ?? ''
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const totalCount = items.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage)
  }, [page, currentPage])

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalCount)

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const goToItemIndex = useCallback((index: number) => {
    setPage(pageForItemIndex(index, pageSize))
  }, [pageSize])

  return {
    pageItems,
    page: currentPage,
    totalPages,
    totalCount,
    pageSize,
    rangeStart,
    rangeEnd,
    setPage,
    goToItemIndex,
  }
}
