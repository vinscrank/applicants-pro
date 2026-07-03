import { TABLE_PAGE_SIZE } from './useTablePagination'
import './TablePagination.css'

interface Props {
  page: number
  totalPages: number
  totalCount: number
  rangeStart: number
  rangeEnd: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export function TablePagination({
  page,
  totalPages,
  totalCount,
  rangeStart,
  rangeEnd,
  pageSize = TABLE_PAGE_SIZE,
  onPageChange,
}: Props) {
  if (totalCount <= pageSize) return null

  return (
    <div className="table-pagination">
      <span className="table-pagination-meta">
        {rangeStart}–{rangeEnd} di {totalCount}
      </span>
      <div className="table-pagination-controls">
        <button
          type="button"
          className="table-pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Precedente
        </button>
        <span className="table-pagination-status">
          Pagina {page} di {totalPages}
        </span>
        <button
          type="button"
          className="table-pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Successiva
        </button>
      </div>
    </div>
  )
}
