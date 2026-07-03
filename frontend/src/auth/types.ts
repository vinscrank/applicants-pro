export interface UserPublic {
  id: number
  email: string
  created_at: string
}

export interface UserProfile {
  user_id: number
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  country: string | null
  address_line: string | null
  headline: string | null
  summary: string | null
  linkedin_url: string | null
  github_url: string | null
  website_url: string | null
  portfolio_url: string | null
  nationality: string | null
  work_authorization: string | null
  years_experience: number | null
  skills: string | null
  has_cv: boolean
  cv_filename: string | null
  full_name: string
  profile_complete: boolean
  updated_at: string | null
}

export interface AuthMeResponse {
  user: UserPublic
  profile: UserProfile
}

export type ProfileFormData = {
  first_name: string
  last_name: string
  phone: string
  city: string
  country: string
  address_line: string
  headline: string
  summary: string
  linkedin_url: string
  github_url: string
  website_url: string
  portfolio_url: string
  nationality: string
  work_authorization: string
  years_experience: string
  skills: string
}

export const EMPTY_PROFILE_FORM: ProfileFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  city: '',
  country: '',
  address_line: '',
  headline: '',
  summary: '',
  linkedin_url: '',
  github_url: '',
  website_url: '',
  portfolio_url: '',
  nationality: '',
  work_authorization: '',
  years_experience: '',
  skills: '',
}

export function profileToForm(profile: UserProfile): ProfileFormData {
  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone: profile.phone || '',
    city: profile.city || '',
    country: profile.country || '',
    address_line: profile.address_line || '',
    headline: profile.headline || '',
    summary: profile.summary || '',
    linkedin_url: profile.linkedin_url || '',
    github_url: profile.github_url || '',
    website_url: profile.website_url || '',
    portfolio_url: profile.portfolio_url || '',
    nationality: profile.nationality || '',
    work_authorization: profile.work_authorization || '',
    years_experience: profile.years_experience != null ? String(profile.years_experience) : '',
    skills: profile.skills || '',
  }
}

export function profileToAutofillPayload(profile: UserProfile) {
  return {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    full_name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    city: profile.city || '',
    country: profile.country || '',
    address_line: profile.address_line || '',
    headline: profile.headline || '',
    summary: profile.summary || '',
    linkedin_url: profile.linkedin_url || '',
    github_url: profile.github_url || '',
    website_url: profile.website_url || '',
    portfolio_url: profile.portfolio_url || '',
    nationality: profile.nationality || '',
    work_authorization: profile.work_authorization || '',
    years_experience: profile.years_experience != null ? String(profile.years_experience) : '',
    skills: profile.skills || '',
    has_cv: profile.has_cv ? '1' : '',
    cv_filename: profile.cv_filename || '',
  }
}
