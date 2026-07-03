import type { Application } from '../types'
import type { JobOffer } from './types'

export function historicalOfferFromApplication(app: Application, offerId: string): JobOffer {
  const appliedRaw = app.last_applied_at || app.created_at
  const appliedAt = appliedRaw ? String(appliedRaw) : null
  return {
    id: offerId,
    company: app.company_name || 'Azienda',
    role: app.job_title || 'Ruolo',
    apply_url: app.job_url || '',
    source: 'tracker',
    origin: 'website',
    posted_at: null,
    language_requirement: null,
    seniority: 'unknown',
    status: 'verified',
    status_reason: 'Candidatura storica dal tracker',
    location: app.location || null,
    verified_at: new Date().toISOString(),
    applied: true,
    applied_at: appliedAt,
    application_id: app.id,
    tracker_status: app.status,
    user_dismissed: false,
    historical: true,
  }
}
