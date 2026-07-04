import type { Application, ApplicationFormData, StatusType } from "./types";
import type { ColorTagId } from "./constants";
import { normalizeApplicationMethod } from "./constants";

export type ApplicationTask = {
  id: string
  application_id: number
  kind: 'follow_up' | 'interview'
  company_name: string
  job_title: string
  due: string
}

export type TaskScope = 'today' | 'week' | 'overdue'

export const api = {
  getTasks: async (_scope: TaskScope = 'today'): Promise<ApplicationTask[]> => {
    return [];
  },
};

export function applicationToForm(app: Application): ApplicationFormData {
  const { application_method, application_method_other } = normalizeApplicationMethod(
    app.application_method,
    app.application_method_other,
  );

  return {
    company_name: app.company_name,
    job_title: app.job_title,
    job_url: app.job_url || "",
    company_website: app.company_website || "",
    company_linkedin_url: app.company_linkedin_url || "",
    location: app.location || "",
    status: app.status,
    priority: app.priority,
    remote_type: app.remote_type,
    application_method,
    application_method_other,
    salary_min: app.salary_min,
    salary_max: app.salary_max,
    salary_currency: app.salary_currency,
    visa_sponsorship: app.visa_sponsorship,
    ta_name: app.ta_name || "",
    ta_email: app.ta_email || "",
    ta_linkedin_url: app.ta_linkedin_url || "",
    ta_phone: app.ta_phone || "",
    hiring_manager_name: app.hiring_manager_name || "",
    hiring_manager_linkedin_url: app.hiring_manager_linkedin_url || "",
    linkedin_connection_sent: app.linkedin_connection_sent,
    linkedin_message_sent: app.linkedin_message_sent,
    follow_up_date: app.follow_up_date || "",
    last_contact_date: app.last_contact_date || "",
    response_received_at: app.response_received_at || "",
    interview_date: app.interview_date || "",
    created_at: app.created_at,
    last_applied_at: app.last_applied_at || "",
    application_source: app.application_source || "manual",
    notes: app.notes || "",
  };
}

export function applicationDateKey(dateStr: string | null): string {
  if (!dateStr) return "";
  return dateStr.slice(0, 10);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const key = applicationDateKey(dateStr);
  return new Date(key + "T00:00:00").toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = dateStr.includes("T") ? new Date(dateStr) : new Date(dateStr + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getApplicationSentDate(app: Application): string {
  return applicationDateKey(app.last_applied_at || app.created_at);
}

export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return "Oggi";
  if (target.getTime() === yesterday.getTime()) return "Ieri";

  const label = date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface ApplicationDayGroup {
  date: string;
  label: string;
  applications: Application[];
}

export function groupApplicationsByDay(applications: Application[]): ApplicationDayGroup[] {
  const groups = new Map<string, Application[]>();

  for (const app of applications) {
    const date = getApplicationSentDate(app);
    const current = groups.get(date) ?? [];
    current.push(app);
    groups.set(date, current);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, apps]) => ({
      date,
      label: formatDayLabel(date),
      applications: apps,
    }));
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") <= today;
}

const REJECTED_STATUSES: StatusType[] = ["rejected", "ghosted", "withdrawn"];
const INTERVIEW_STATUSES: StatusType[] = [
  "phone_screen",
  "technical_interview",
  "final_interview",
  "offer",
  "accepted",
];
const WAITING_STATUSES: StatusType[] = ["draft", "applied", "follow_up_sent"];
const NEW_APPLICATION_DAYS = 7;

export function isRecentlyCreated(createdAt: string): boolean {
  const created = new Date(createdAt + "T00:00:00");
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - NEW_APPLICATION_DAYS);
  return created >= cutoff;
}

export function getApplicationRowClass(app: Application): string {
  if (REJECTED_STATUSES.includes(app.status)) return "row-rejected";
  if (INTERVIEW_STATUSES.includes(app.status) || app.interview_date) return "row-interview";
  if (isRecentlyCreated(getApplicationSentDate(app))) return "row-new";
  if (WAITING_STATUSES.includes(app.status)) return "row-waiting";
  return "";
}

export function applicationMatchesColorTag(app: Application, tag: ColorTagId): boolean {
  switch (tag) {
    case "rejected":
      return REJECTED_STATUSES.includes(app.status);
    case "waiting":
      return WAITING_STATUSES.includes(app.status);
    case "new":
      return isRecentlyCreated(getApplicationSentDate(app));
    case "interview":
      return INTERVIEW_STATUSES.includes(app.status) || !!app.interview_date;
  }
}

export function filterByColorTags(
  applications: Application[],
  tags: ColorTagId[],
): Application[] {
  if (tags.length === 0) return applications;
  return applications.filter((app) =>
    tags.some((tag) => applicationMatchesColorTag(app, tag)),
  );
}
