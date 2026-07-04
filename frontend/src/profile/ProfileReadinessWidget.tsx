import { useTranslation } from 'react-i18next'
import { computeProfileReadiness } from '@/profile/profileReadiness'
import { navigate } from '@/router'
import { Button } from '@/components/ui/button'
import './profile-readiness-banner.css'

interface Props {
  profile: {
    full_name?: string | null
    headline?: string | null
    summary?: string | null
    skills?: string | null
    city?: string | null
    country?: string | null
    linkedin_url?: string | null
    years_experience?: number | null
  } | null | undefined
}

export function ProfileReadinessWidget({ profile }: Props) {
  const { t } = useTranslation()
  const readiness = computeProfileReadiness(profile)

  return (
    <section className="profile-readiness-widget">
      <div className="profile-readiness-widget-head">
        <div>
          <h2 className="text-base font-semibold">{t('profileReadiness.widgetTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('profileReadiness.widgetLead')}</p>
        </div>
        <span className="profile-readiness-widget-score">{readiness.score}%</span>
      </div>
      <div className="profile-readiness-banner-bar" aria-hidden="true">
        <span className="profile-readiness-banner-fill" style={{ width: `${readiness.score}%` }} />
      </div>
      <ul className="profile-readiness-widget-list">
        {readiness.items.map((item) => (
          <li key={item.id} className={`profile-readiness-widget-item${item.complete ? ' is-done' : ''}`}>
            <span>{t(item.labelKey)}</span>
            <span className="profile-readiness-widget-status">
              {item.complete ? t('profileReadiness.done') : t('profileReadiness.missing')}
            </span>
          </li>
        ))}
      </ul>
      {readiness.score < 100 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => navigate({ page: 'account', accountTab: 'profile' })}
        >
          {t('profileReadiness.completeProfile')}
        </Button>
      ) : null}
    </section>
  )
}
