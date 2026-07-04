export const STRONG_FIT_THRESHOLD = 70

export interface ProfileFitFields {
  profile_fit_score?: number
  profile_fit_label?: string
  profile_fit_available?: boolean
  profile_fit_feedback?: string
}

export function isStrongProfileFit(offer: ProfileFitFields): boolean {
  return (
    offer.profile_fit_available === true
    && (offer.profile_fit_score ?? 0) >= STRONG_FIT_THRESHOLD
  )
}

export function profileFitSortScore(offer: ProfileFitFields): number {
  if (offer.profile_fit_available && (offer.profile_fit_score ?? 0) > 0) {
    return offer.profile_fit_score ?? 0
  }
  return -1
}

export function sortByProfileFit<T extends ProfileFitFields>(offers: T[]): T[] {
  return [...offers].sort((a, b) => profileFitSortScore(b) - profileFitSortScore(a))
}

export function countStrongMatches(offers: ProfileFitFields[]): number {
  return offers.filter(isStrongProfileFit).length
}
