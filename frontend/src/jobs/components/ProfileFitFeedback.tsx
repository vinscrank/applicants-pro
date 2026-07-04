import { ProfileFitBadge } from '@/jobs/components/ProfileFitBadge'
import type { ProfileFitFields } from '@/jobs/profileFit'

interface Props {
  offer: ProfileFitFields
}

export function ProfileFitFeedback({ offer }: Props) {
  if (!offer.profile_fit_available || !(offer.profile_fit_score ?? 0)) return null
  return (
    <div className="profile-fit-feedback">
      <ProfileFitBadge
        score={offer.profile_fit_score}
        label={offer.profile_fit_label}
        available={offer.profile_fit_available}
      />
      {offer.profile_fit_feedback ? (
        <span className="profile-fit-feedback-text">{offer.profile_fit_feedback}</span>
      ) : null}
    </div>
  )
}
