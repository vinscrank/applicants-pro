import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ProfileFitFeedback } from '@/jobs/components/ProfileFitFeedback'
import type { TopMatchEntry } from '@/discover/topMatchesCache'
import { navigate } from '@/router'
import './top-matches-section.css'

interface Props {
  matches: TopMatchEntry[]
}

export function TopMatchesSection({ matches }: Props) {
  const { t } = useTranslation()
  if (!matches.length) return null

  return (
    <section className="top-matches-section">
      <div className="top-matches-section-head">
        <h2 className="top-matches-section-title">{t('today.topMatchesTitle')}</h2>
        <p className="top-matches-section-lead">{t('today.topMatchesLead')}</p>
      </div>
      <div className="top-matches-grid">
        {matches.map((match) => (
          <article key={match.id} className="top-match-card">
            <div className="top-match-card-head">
              <div className="min-w-0">
                <h3 className="top-match-role">{match.role}</h3>
                <p className="top-match-company">{match.company}</p>
              </div>
              <ProfileFitFeedback offer={match} />
            </div>
            {match.location ? (
              <p className="top-match-location">{match.location}</p>
            ) : null}
            <div className="top-match-actions">
              {match.apply_url ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(match.apply_url, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('jobs.actions.open')}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                onClick={() => navigate({ page: 'discover', tab: match.source === 'careers' ? 'careers' : 'search' })}
              >
                {t('today.topMatchesViewInDiscover')}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
