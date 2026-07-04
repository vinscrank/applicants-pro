import type {
  CreateApplicationInput,
  UpdateApplicationInput,
} from "@/graphql/mutations";
import type { GqlApplication } from "@/graphql/queries";
import type {
  Application,
  ApplicationFormData,
  ApplicationMethodType,
  ApplicationSourceType,
  PriorityType,
  RemoteType,
  StatusType,
} from "@/types";

function blankToNull(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  return value;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}

export function gqlToApplication(row: GqlApplication): Application {
  return {
    id: Number(row.id),
    company_name: row.companyName,
    job_title: row.jobTitle,
    job_url: row.jobUrl,
    company_website: row.companyWebsite,
    company_linkedin_url: row.companyLinkedinUrl,
    location: row.location,
    status: row.status as StatusType,
    priority: row.priority as PriorityType,
    remote_type: row.remoteType as RemoteType | null,
    application_method: row.applicationMethod as ApplicationMethodType | null,
    application_method_other: row.applicationMethodOther,
    salary_min: row.salaryMin,
    salary_max: row.salaryMax,
    salary_currency: row.salaryCurrency,
    visa_sponsorship: row.visaSponsorship,
    ta_name: row.taName,
    ta_email: row.taEmail,
    ta_linkedin_url: row.taLinkedinUrl,
    ta_phone: row.taPhone,
    hiring_manager_name: row.hiringManagerName,
    hiring_manager_linkedin_url: row.hiringManagerLinkedinUrl,
    linkedin_connection_sent: row.linkedinConnectionSent,
    linkedin_message_sent: row.linkedinMessageSent,
    follow_up_date: formatDate(row.followUpDate),
    last_contact_date: formatDate(row.lastContactDate),
    response_received_at: formatDate(row.responseReceivedAt),
    interview_date: formatDate(row.interviewDate),
    created_at: formatDate(row.createdAt) ?? row.createdAt,
    last_applied_at: formatDateTime(row.lastAppliedAt),
    application_source: row.applicationSource as ApplicationSourceType,
    linked_offer_id: row.linkedOfferId,
    notes: row.notes,
    updated_at: formatDateTime(row.updatedAt) ?? row.updatedAt,
  };
}

function formToInputFields(
  data: Partial<ApplicationFormData>,
): Omit<CreateApplicationInput, "companyName" | "jobTitle"> {
  return {
    jobUrl: blankToNull(data.job_url),
    companyWebsite: blankToNull(data.company_website),
    companyLinkedinUrl: blankToNull(data.company_linkedin_url),
    location: blankToNull(data.location),
    status: data.status ?? null,
    priority: data.priority ?? null,
    remoteType: blankToNull(data.remote_type),
    applicationMethod: blankToNull(data.application_method),
    applicationMethodOther: blankToNull(data.application_method_other),
    salaryMin: data.salary_min ?? null,
    salaryMax: data.salary_max ?? null,
    salaryCurrency: blankToNull(data.salary_currency),
    visaSponsorship: data.visa_sponsorship ?? null,
    taName: blankToNull(data.ta_name),
    taEmail: blankToNull(data.ta_email),
    taLinkedinUrl: blankToNull(data.ta_linkedin_url),
    taPhone: blankToNull(data.ta_phone),
    hiringManagerName: blankToNull(data.hiring_manager_name),
    hiringManagerLinkedinUrl: blankToNull(data.hiring_manager_linkedin_url),
    linkedinConnectionSent: data.linkedin_connection_sent ?? null,
    linkedinMessageSent: data.linkedin_message_sent ?? null,
    followUpDate: blankToNull(data.follow_up_date),
    lastContactDate: blankToNull(data.last_contact_date),
    responseReceivedAt: blankToNull(data.response_received_at),
    interviewDate: blankToNull(data.interview_date),
    lastAppliedAt: blankToNull(data.last_applied_at),
    applicationSource: data.application_source ?? null,
    linkedOfferId: blankToNull(data.linked_offer_id),
    notes: blankToNull(data.notes),
  };
}

export function formToCreateInput(
  data: ApplicationFormData,
): CreateApplicationInput {
  return {
    companyName: data.company_name,
    jobTitle: data.job_title,
    ...formToInputFields(data),
  };
}

export function formToUpdateInput(
  id: number,
  data: Partial<ApplicationFormData>,
): UpdateApplicationInput {
  const input: UpdateApplicationInput = { id: String(id) };
  if (data.company_name !== undefined) input.companyName = data.company_name;
  if (data.job_title !== undefined) input.jobTitle = data.job_title;
  if (data.job_url !== undefined) input.jobUrl = blankToNull(data.job_url);
  if (data.company_website !== undefined) input.companyWebsite = blankToNull(data.company_website);
  if (data.company_linkedin_url !== undefined) {
    input.companyLinkedinUrl = blankToNull(data.company_linkedin_url);
  }
  if (data.location !== undefined) input.location = blankToNull(data.location);
  if (data.status !== undefined) input.status = data.status;
  if (data.priority !== undefined) input.priority = data.priority;
  if (data.remote_type !== undefined) input.remoteType = blankToNull(data.remote_type);
  if (data.application_method !== undefined) {
    input.applicationMethod = blankToNull(data.application_method);
  }
  if (data.application_method_other !== undefined) {
    input.applicationMethodOther = blankToNull(data.application_method_other);
  }
  if (data.salary_min !== undefined) input.salaryMin = data.salary_min;
  if (data.salary_max !== undefined) input.salaryMax = data.salary_max;
  if (data.salary_currency !== undefined) {
    input.salaryCurrency = blankToNull(data.salary_currency);
  }
  if (data.visa_sponsorship !== undefined) input.visaSponsorship = data.visa_sponsorship;
  if (data.ta_name !== undefined) input.taName = blankToNull(data.ta_name);
  if (data.ta_email !== undefined) input.taEmail = blankToNull(data.ta_email);
  if (data.ta_linkedin_url !== undefined) input.taLinkedinUrl = blankToNull(data.ta_linkedin_url);
  if (data.ta_phone !== undefined) input.taPhone = blankToNull(data.ta_phone);
  if (data.hiring_manager_name !== undefined) {
    input.hiringManagerName = blankToNull(data.hiring_manager_name);
  }
  if (data.hiring_manager_linkedin_url !== undefined) {
    input.hiringManagerLinkedinUrl = blankToNull(data.hiring_manager_linkedin_url);
  }
  if (data.linkedin_connection_sent !== undefined) {
    input.linkedinConnectionSent = data.linkedin_connection_sent;
  }
  if (data.linkedin_message_sent !== undefined) {
    input.linkedinMessageSent = data.linkedin_message_sent;
  }
  if (data.follow_up_date !== undefined) input.followUpDate = blankToNull(data.follow_up_date);
  if (data.last_contact_date !== undefined) {
    input.lastContactDate = blankToNull(data.last_contact_date);
  }
  if (data.response_received_at !== undefined) {
    input.responseReceivedAt = blankToNull(data.response_received_at);
  }
  if (data.interview_date !== undefined) input.interviewDate = blankToNull(data.interview_date);
  if (data.last_applied_at !== undefined) input.lastAppliedAt = blankToNull(data.last_applied_at);
  if (data.application_source !== undefined) input.applicationSource = data.application_source;
  if (data.linked_offer_id !== undefined) input.linkedOfferId = blankToNull(data.linked_offer_id);
  if (data.notes !== undefined) input.notes = blankToNull(data.notes);
  return input;
}

export function filterApplicationsList(
  applications: Application[],
  params?: {
    status?: string;
    search?: string;
    exclude_rejected?: boolean;
    include_drafts?: boolean;
  },
): Application[] {
  let apps = applications;
  if (params?.exclude_rejected !== false) {
    apps = apps.filter(
      (a) =>
        a.status !== "rejected" &&
        a.status !== "ghosted" &&
        a.status !== "withdrawn",
    );
  }
  if (!params?.include_drafts) {
    apps = apps.filter((a) => a.status !== "draft");
  }
  if (params?.status) {
    apps = apps.filter((a) => a.status === params.status);
  }
  if (params?.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    apps = apps.filter(
      (a) =>
        a.company_name.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q),
    );
  }
  return apps;
}

export function gqlStatsToStats(stats: {
  total: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  followUpDue: number;
  linkedinPending: number;
  appliedToday: number;
  dailyAverage: number;
  byStatus: Array<{ status: string; count: number }>;
}): import("@/types").Stats {
  const by_status: Record<string, number> = {};
  for (const row of stats.byStatus ?? []) {
    by_status[row.status] = row.count;
  }
  return {
    total: stats.total,
    by_status,
    follow_up_due: stats.followUpDue,
    linkedin_pending: stats.linkedinPending,
    applied_today: stats.appliedToday,
    daily_average: stats.dailyAverage,
  };
}
