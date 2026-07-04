import { useTranslation } from 'react-i18next'
import { computeProfileReadiness } from '@/profile/profileReadiness'
import { navigate } from '@/router'
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

export function ProfileReadinessBanner({ profile }: Props) {
  const { t } = useTranslation()
  const readiness = computeProfileReadiness(profile)
  if (readiness.score >= 60) return null

  return (
    <div className="profile-readiness-banner" role="status">
      <div className="profile-readiness-banner-copy">
        <p className="profile-readiness-banner-title">
          {t('profileReadiness.bannerTitle', { score: readiness.score })}
        </p>
        <p className="profile-readiness-banner-lead">{t('profileReadiness.bannerLead')}</p>
      </div>
      <div className="profile-readiness-banner-bar" aria-hidden="true">
        <span className="profile-readiness-banner-fill" style={{ width: `${readiness.score}%` }} />
      </div>
      <ul className="profile-readiness-banner-list">
        {readiness.items.filter((item) => !item.complete).slice(0, 3).map((item) => (
          <li key={item.id}>
            <button type="button" className="profile-readiness-banner-link" onClick={() => navigate({ page: 'account', accountTab: 'profile' })}>
              {t(item.labelKey)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
