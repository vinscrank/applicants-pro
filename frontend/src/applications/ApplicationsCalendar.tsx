import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Mail } from 'lucide-react'
import type { Application } from '@/types'
import { navigate } from '@/router'
import { Card, CardContent } from '@/components/ui/card'

interface ApplicationsCalendarProps {
  applications: Application[]
}

type CalendarEntry = {
  key: string
  date: string
  label: string
  applicationId: number
  company: string
  role: string
  kind: 'follow_up' | 'interview'
}

function formatDay(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function ApplicationsCalendar({ applications }: ApplicationsCalendarProps) {
  const { t, i18n } = useTranslation()

  const entries = useMemo(() => {
    const rows: CalendarEntry[] = []
    applications.forEach((app) => {
      if (app.follow_up_date) {
        rows.push({
          key: `fu-${app.id}`,
          date: app.follow_up_date,
          label: t('activity.followUp', { company: app.company_name }),
          applicationId: app.id,
          company: app.company_name,
          role: app.job_title,
          kind: 'follow_up',
        })
      }
      if (app.interview_date) {
        rows.push({
          key: `in-${app.id}`,
          date: app.interview_date,
          label: t('activity.interview', { company: app.company_name }),
          applicationId: app.id,
          company: app.company_name,
          role: app.job_title,
          kind: 'interview',
        })
      }
    })
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.applicationId - b.applicationId)
    return rows
  }, [applications, t])

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    entries.forEach((entry) => {
      const bucket = map.get(entry.date) ?? []
      bucket.push(entry)
      map.set(entry.date, bucket)
    })
    return [...map.entries()]
  }, [entries])

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t('common.noData')}</p>
  }

  return (
    <div className="space-y-4">
      {grouped.map(([date, dayEntries]) => (
        <Card key={date}>
          <CardContent className="pt-4">
            <p className="mb-3 text-sm font-semibold">{formatDay(date, i18n.language)}</p>
            <div className="space-y-2">
              {dayEntries.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className="platform-list-row w-full"
                  onClick={() => navigate({ page: 'application', applicationId: entry.applicationId })}
                >
                  <div className="platform-list-row-icon">
                    {entry.kind === 'interview' ? (
                      <Calendar className="h-4 w-4" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium truncate">{entry.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
