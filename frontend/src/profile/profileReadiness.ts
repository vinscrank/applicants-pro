export interface ProfileReadinessItem {
  id: string
  labelKey: string
  complete: boolean
  href: string
}

export interface ProfileReadinessResult {
  score: number
  items: ProfileReadinessItem[]
}

interface ProfileInput {
  full_name?: string | null
  headline?: string | null
  summary?: string | null
  skills?: string | null
  city?: string | null
  country?: string | null
  linkedin_url?: string | null
  years_experience?: number | null
}

export function computeProfileReadiness(profile: ProfileInput | null | undefined): ProfileReadinessResult {
  const items: ProfileReadinessItem[] = [
    {
      id: 'name',
      labelKey: 'profileReadiness.items.name',
      complete: Boolean(profile?.full_name?.trim()),
      href: '/account?tab=profile',
    },
    {
      id: 'headline',
      labelKey: 'profileReadiness.items.headline',
      complete: Boolean(profile?.headline?.trim()),
      href: '/account?tab=profile',
    },
    {
      id: 'skills',
      labelKey: 'profileReadiness.items.skills',
      complete: Boolean(profile?.skills?.trim()),
      href: '/account?tab=profile',
    },
    {
      id: 'location',
      labelKey: 'profileReadiness.items.location',
      complete: Boolean(profile?.city?.trim() || profile?.country?.trim()),
      href: '/account?tab=profile',
    },
    {
      id: 'experience',
      labelKey: 'profileReadiness.items.experience',
      complete: profile?.years_experience != null && profile.years_experience >= 0,
      href: '/account?tab=profile',
    },
  ]
  const completeCount = items.filter((item) => item.complete).length
  const score = items.length ? Math.round((completeCount / items.length) * 100) : 0
  return { score, items }
}

export function isProfileReadinessLow(score: number): boolean {
  return score < 60
}
