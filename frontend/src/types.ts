export type StatusType =
  | "draft"
  | "applied"
  | "follow_up_sent"
  | "phone_screen"
  | "technical_interview"
  | "final_interview"
  | "offer"
  | "accepted"
  | "rejected"
  | "ghosted"
  | "withdrawn";

export type PriorityType = "low" | "medium" | "high";
export type RemoteType = "remote" | "hybrid" | "onsite" | "unknown";
export type ApplicationMethodType =
  | "linkedin"
  | "company_website"
  | "indeed"
  | "other"
  | "email"
  | "recruiter"
  | "referral"
  | "job_board";

export type FormApplicationMethodType =
  | "company_website"
  | "linkedin"
  | "indeed"
  | "other";

export type ApplicationSourceType = "manual" | "quick_add" | "live_jobs" | "careers" | "extension";

export interface Application {
  id: number;
  company_name: string;
  job_title: string;
  job_url: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;
  location: string | null;
  status: StatusType;
  priority: PriorityType;
  remote_type: RemoteType | null;
  application_method: ApplicationMethodType | null;
  application_method_other: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  visa_sponsorship: boolean | null;
  ta_name: string | null;
  ta_email: string | null;
  ta_linkedin_url: string | null;
  ta_phone: string | null;
  hiring_manager_name: string | null;
  hiring_manager_linkedin_url: string | null;
  linkedin_connection_sent: boolean;
  linkedin_message_sent: boolean;
  follow_up_date: string | null;
  last_contact_date: string | null;
  response_received_at: string | null;
  interview_date: string | null;
  created_at: string;
  last_applied_at: string | null;
  application_source: ApplicationSourceType;
  linked_offer_id?: string | null;
  notes: string | null;
  updated_at: string;
}

export type ApplicationFormData = Omit<
  Application,
  "id" | "updated_at"
>;

export interface Stats {
  total: number;
  by_status: Record<string, number>;
  follow_up_due: number;
  linkedin_pending: number;
  applied_today: number;
  daily_average: number;
}

export interface ExportData {
  version: number;
  exported_at: string;
  applications: Application[];
}

export interface ImportResult {
  imported: number;
  replace: boolean;
}
