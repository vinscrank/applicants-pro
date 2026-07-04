import type { ApplicationTrackerMatch } from '../applications/trackerMatch'

export interface LiveOfferMatch {
  offer_id: string
  company: string
  role: string
  apply_url: string
  applied: boolean
  dismissed?: boolean
}

export interface JobUrlAnalysis {
  url: string
  origin: string
  role: string
  company: string
  location: string
  posted_at: string
  origin_label: string
  application_method: string
  remote_type: string
  summary: string
  review: string
  highlights: string[]
  concerns: string[]
  tracker_match?: ApplicationTrackerMatch | null
  live_offer_matches?: LiveOfferMatch[]
  user_dismissed?: boolean
  profile_fit_score?: number
  profile_fit_label?: string
  profile_fit_available?: boolean
  profile_fit_feedback?: string
}
