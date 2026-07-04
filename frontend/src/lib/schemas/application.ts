import { z } from 'zod'

const statusEnum = z.enum([
  'draft',
  'applied',
  'follow_up_sent',
  'phone_screen',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
  'rejected',
  'ghosted',
  'withdrawn',
])

export const applicationSchema = z.object({
  company_name: z.string().min(1),
  job_title: z.string().min(1),
  job_url: z.string().nullable(),
  status: statusEnum,
  application_method: z
    .enum(['company_website', 'linkedin', 'indeed', 'other', 'email', 'recruiter', 'referral', 'job_board'])
    .nullable(),
  application_method_other: z.string().nullable(),
  application_source: z.enum(['manual', 'quick_add', 'live_jobs', 'careers']),
  notes: z.string().nullable(),
  location: z.string().nullable(),
  remote_type: z.enum(['remote', 'hybrid', 'onsite', 'unknown']).nullable(),
  priority: z.enum(['low', 'medium', 'high']),
  visa_sponsorship: z.boolean().nullable(),
  follow_up_date: z.string().nullable(),
  last_contact_date: z.string().nullable(),
  response_received_at: z.string().nullable(),
  interview_date: z.string().nullable(),
  ta_name: z.string().nullable(),
  ta_email: z.string().nullable(),
  ta_phone: z.string().nullable(),
  ta_linkedin_url: z.string().nullable(),
  hiring_manager_name: z.string().nullable(),
  hiring_manager_linkedin_url: z.string().nullable(),
  linkedin_connection_sent: z.boolean(),
  linkedin_message_sent: z.boolean(),
  company_website: z.string().nullable(),
  company_linkedin_url: z.string().nullable(),
  salary_min: z.number().nullable(),
  salary_max: z.number().nullable(),
  salary_currency: z.string(),
  created_at: z.string(),
  last_applied_at: z.string().nullable(),
})

export type ApplicationSchemaValues = z.infer<typeof applicationSchema>

export const profileSchema = z.object({
  full_name: z.string().min(1),
  headline: z.string(),
  bio: z.string(),
  location: z.string(),
  phone: z.string(),
  linkedin_url: z.string(),
  github_url: z.string(),
  portfolio_url: z.string(),
  website_url: z.string(),
  skills: z.string(),
  languages: z.string(),
  work_authorization: z.string(),
  preferred_roles: z.string(),
  preferred_locations: z.string(),
  remote_preference: z.string(),
  salary_expectation: z.string(),
  availability: z.string(),
})

export type ProfileSchemaValues = z.infer<typeof profileSchema>
