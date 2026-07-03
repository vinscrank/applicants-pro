import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Application, StatusType } from '@/types'
import { kanbanColumnLabel, priorityLabel } from '@/i18n/labels'
import { navigate } from '@/router'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'
import { mapDbStatusToUi } from './status'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type KanbanStage = 'draft' | 'applied' | 'interview' | 'offer' | 'closed'

const STAGE_STATUSES: Record<KanbanStage, StatusType[]> = {
  draft: ['draft'],
  applied: ['applied', 'follow_up_sent'],
  interview: ['phone_screen', 'technical_interview', 'final_interview'],
  offer: ['offer', 'accepted'],
  closed: ['rejected', 'ghosted', 'withdrawn'],
}

const STAGES: KanbanStage[] = ['draft', 'applied', 'interview', 'offer', 'closed']

interface Props {
  applications: Application[]
  onStatusChange: (id: number, status: StatusType) => void
}

export function ApplicationsKanban({ applications, onStatusChange }: Props) {
  const { t } = useTranslation()
  const [draggedApp, setDraggedApp] = useState<Application | null>(null)
  const [dragOverStage, setDragOverStage] = useState<KanbanStage | null>(null)

  const formatDaysAgo = (dateStr: string): string => {
    const date = new Date(dateStr)
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('common.today')
    return t('common.daysAgo', { count: diffDays })
  }

  const getAppsForStage = (stage: KanbanStage) =>
    applications.filter((app) => STAGE_STATUSES[stage].includes(app.status))

  const handleDrop = (stage: KanbanStage) => {
    if (!draggedApp) return
    const newStatus = STAGE_STATUSES[stage][0]
    if (draggedApp.status !== newStatus) {
      onStatusChange(draggedApp.id, newStatus)
    }
    setDraggedApp(null)
    setDragOverStage(null)
  }

  return (
    <div className="platform-kanban-board">
      {STAGES.map((stage) => {
        const stageApps = getAppsForStage(stage)
        const isOver = dragOverStage === stage

        return (
          <div
            key={stage}
            className={cn('platform-kanban-column', isOver && 'is-drag-over')}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverStage(stage)
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={() => handleDrop(stage)}
          >
            <div className="platform-kanban-column-header">
              <span className="platform-kanban-column-title">{kanbanColumnLabel(stage)}</span>
              <Badge variant="secondary" className="text-xs font-normal tabular-nums">
                {stageApps.length}
              </Badge>
            </div>
            <div className="platform-kanban-column-body">
              {stageApps.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={() => setDraggedApp(app)}
                  onDragEnd={() => {
                    setDraggedApp(null)
                    setDragOverStage(null)
                  }}
                  onClick={() => navigate({ page: 'application', applicationId: app.id })}
                  className={cn(
                    'platform-kanban-card',
                    draggedApp?.id === app.id && 'is-dragging'
                  )}
                >
                  <p className="platform-kanban-card-company">{app.company_name}</p>
                  <p className="platform-kanban-card-role">{app.job_title}</p>
                  <div className="platform-kanban-card-meta">
                    <span className="text-xs text-muted-foreground">{formatDaysAgo(app.created_at)}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {app.priority !== 'medium' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {priorityLabel(app.priority)}
                        </Badge>
                      )}
                      <ApplicationStatusBadge status={mapDbStatusToUi(app.status)} />
                    </div>
                  </div>
                </div>
              ))}
              {stageApps.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">{t('common.dragHere')}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
