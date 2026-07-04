import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Application, StatusType } from '@/types'
import { formatDateTime } from '@/api'
import { getStatusOptions } from '@/constants'
import { priorityLabel, sourceLabel } from '@/i18n/labels'
import { navigate } from '@/router'
import { navigateToJobs } from '@/pipeline/pipelineBridge'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'
import { mapDbStatusToUi } from './status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface ApplicationsTableMeta {
  updatingId: number | null
  onStatusChange: (id: number, status: StatusType) => void
  onEdit: (app: Application) => void
  onDelete: (id: number) => void
}

export function getApplicationsColumns(t: TFunction): ColumnDef<Application>[] {
  const statusOptions = getStatusOptions()

  return [
    {
      accessorKey: 'company_name',
      header: t('candidature.table.company'),
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-left hover:underline truncate max-w-[180px] block"
          onClick={() => navigate({ page: 'application', applicationId: row.original.id })}
        >
          {row.original.company_name}
        </button>
      ),
    },
    {
      accessorKey: 'job_title',
      header: t('candidature.table.role'),
      cell: ({ row }) => (
        <span className="truncate max-w-[200px] block text-muted-foreground" title={row.original.job_title}>
          {row.original.job_title}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('candidature.table.status'),
      cell: ({ row, table }) => {
        const meta = table.options.meta as ApplicationsTableMeta
        const app = row.original
        return (
          <Select
            value={app.status}
            disabled={meta.updatingId === app.id}
            onValueChange={(value) => meta.onStatusChange(app.id, value as StatusType)}
          >
            <SelectTrigger className="h-8 w-auto border-0 bg-transparent shadow-none px-0 focus:ring-0 gap-1">
              <ApplicationStatusBadge status={mapDbStatusToUi(app.status)} />
            </SelectTrigger>
            <SelectContent className="platform-portal">
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'priority',
      header: t('candidature.table.priority'),
      cell: ({ row }) => {
        const priority = row.original.priority
        if (priority === 'medium') return <span className="text-muted-foreground text-xs">—</span>
        return (
          <Badge variant="outline" className={cn('text-xs', priority === 'high' && 'border-orange-300 text-orange-700')}>
            {priorityLabel(priority)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'application_source',
      header: t('candidature.table.source'),
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs font-normal">
          {sourceLabel(row.original.application_source || 'manual')}
        </Badge>
      ),
    },
    {
      id: 'applied_at',
      accessorFn: (row) => row.last_applied_at || row.created_at,
      sortingFn: 'datetime',
      header: t('candidature.table.appliedAt'),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.original.last_applied_at || row.original.created_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row, table }) => {
        const meta = table.options.meta as ApplicationsTableMeta
        const app = row.original
        const fromLive = app.application_source === 'live_jobs'
        const offerId = app.linked_offer_id

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="platform-portal">
              <DropdownMenuItem onClick={() => meta.onEdit(app)}>
                <Pencil className="h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              {app.job_url && (
                <DropdownMenuItem asChild>
                  <a href={app.job_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    {t('common.openJobPosting')}
                  </a>
                </DropdownMenuItem>
              )}
              {fromLive && offerId && (
                <DropdownMenuItem
                  onClick={() =>
                    navigateToJobs({
                      highlightOfferId: offerId,
                      statusFilter: 'applied',
                      trackerApplicationId: app.id,
                    })
                  }
                >
                  {t('candidature.table.viewInLiveOffers')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => meta.onDelete(app.id)}
              >
                <Trash2 className="h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
