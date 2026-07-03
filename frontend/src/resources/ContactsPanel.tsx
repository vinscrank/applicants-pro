import { useMemo } from 'react'
import { ArrowRight, ExternalLink, Mail, Phone, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navigate } from '@/router'
import { useApplicationsQuery } from '@/hooks/useApplicationsQuery'
import { PageLoading } from '@/layout/PageLayout'
import { PlatformEmptyState } from '@/layout/PlatformEmptyState'
import { Badge } from '@/components/ui/badge'

export function ContactsPanel() {
  const { t } = useTranslation()
  const { applications, loading } = useApplicationsQuery()

  const contacts = useMemo(() => {
    const contactList: {
      id: string
      name: string
      role: 'ta' | 'hm'
      email?: string
      phone?: string
      linkedinUrl?: string
      company: string
      applicationId: number
    }[] = []

    applications.forEach((app) => {
      if (app.ta_name) {
        contactList.push({
          id: `ta-${app.id}`,
          name: app.ta_name,
          role: 'ta',
          email: app.ta_email || undefined,
          phone: app.ta_phone || undefined,
          linkedinUrl: app.ta_linkedin_url || undefined,
          company: app.company_name,
          applicationId: app.id,
        })
      }
      if (app.hiring_manager_name) {
        contactList.push({
          id: `hm-${app.id}`,
          name: app.hiring_manager_name,
          role: 'hm',
          linkedinUrl: app.hiring_manager_linkedin_url || undefined,
          company: app.company_name,
          applicationId: app.id,
        })
      }
    })

    return contactList.sort((a, b) => a.name.localeCompare(b.name))
  }, [applications])

  if (loading) return <PageLoading />

  if (contacts.length === 0) {
    return (
      <PlatformEmptyState
        icon={<Users className="h-7 w-7" />}
        title={t('resources.noContacts')}
        description={t('resources.contactsHint')}
      />
    )
  }

  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <button
          key={contact.id}
          type="button"
          className="platform-list-row"
          onClick={() => navigate({ page: 'application', applicationId: contact.applicationId })}
        >
          <div className="platform-list-row-icon text-sm font-semibold">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{contact.name}</span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {contact.role === 'ta' ? t('resources.recruiter') : t('resources.hiringManager')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{contact.company}</p>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3 w-3" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3 w-3" />
                  {contact.phone}
                </a>
              )}
              {contact.linkedinUrl && (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  )
}
