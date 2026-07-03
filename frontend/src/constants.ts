import type { StatusType, PriorityType, RemoteType, ApplicationMethodType, FormApplicationMethodType, ApplicationSourceType } from "./types";
import {
  statusLabel,
  priorityLabel,
  remoteLabel,
  sourceLabel,
  methodLabel,
} from "./i18n/labels";

const STATUS_TYPES: StatusType[] = [
  "draft",
  "applied",
  "follow_up_sent",
  "phone_screen",
  "technical_interview",
  "final_interview",
  "offer",
  "accepted",
  "rejected",
  "ghosted",
  "withdrawn",
];

export const STATUS_LABELS = new Proxy({} as Record<StatusType, string>, {
  get(_target, prop: string) {
    return statusLabel(prop as StatusType);
  },
});

export function getStatusOptions(): { value: StatusType; label: string }[] {
  return STATUS_TYPES.map((value) => ({ value, label: statusLabel(value) }));
}

export const STATUS_OPTIONS = getStatusOptions();

export const DAILY_APPLICATION_GOAL = 20;

export type ColorTagId = "rejected" | "waiting" | "new" | "interview";

export const COLOR_TAGS: { id: ColorTagId; label: string }[] = [
  { id: "rejected", label: "Rifiutate" },
  { id: "waiting", label: "In attesa" },
  { id: "new", label: "Recenti" },
  { id: "interview", label: "Colloquio" },
];

export const PRIORITY_LABELS = new Proxy({} as Record<PriorityType, string>, {
  get(_target, prop: string) {
    return priorityLabel(prop as PriorityType);
  },
});

export const REMOTE_LABELS = new Proxy({} as Record<RemoteType, string>, {
  get(_target, prop: string) {
    return remoteLabel(prop as RemoteType);
  },
});

export const SOURCE_LABELS = new Proxy({} as Record<ApplicationSourceType, string>, {
  get(_target, prop: string) {
    return sourceLabel(prop as ApplicationSourceType);
  },
});

export const METHOD_LABELS = new Proxy({} as Record<ApplicationMethodType, string>, {
  get(_target, prop: string) {
    return methodLabel(prop as ApplicationMethodType);
  },
});

export const APPLICATION_SOURCE_OPTIONS: { value: FormApplicationMethodType; label: string }[] = [
  { value: "company_website", label: "Sito azienda" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "other", label: "Altro" },
];

const LEGACY_APPLICATION_METHODS: ApplicationMethodType[] = [
  "email",
  "recruiter",
  "referral",
  "job_board",
];

export function normalizeApplicationMethod(
  method: ApplicationMethodType | null,
  other: string | null,
): { application_method: FormApplicationMethodType; application_method_other: string } {
  if (method && LEGACY_APPLICATION_METHODS.includes(method)) {
    return {
      application_method: "other",
      application_method_other: other || methodLabel(method),
    };
  }
  if (method === "company_website" || method === "linkedin" || method === "indeed" || method === "other") {
    return {
      application_method: method,
      application_method_other: other || "",
    };
  }
  return {
    application_method: "company_website",
    application_method_other: "",
  };
}

export function getApplicationSourceLabel(
  method: ApplicationMethodType | null,
  other: string | null,
): string {
  if (!method) return "—";
  if (method === "other" && other) return other;
  return methodLabel(method) || method;
}

export const EMPTY_FORM = {
  company_name: "",
  job_title: "",
  job_url: "",
  company_website: "",
  company_linkedin_url: "",
  location: "",
  status: "applied" as StatusType,
  priority: "medium" as PriorityType,
  remote_type: "unknown" as RemoteType,
  application_method: "company_website" as FormApplicationMethodType,
  application_method_other: "",
  salary_min: null as number | null,
  salary_max: null as number | null,
  salary_currency: "EUR",
  visa_sponsorship: null as boolean | null,
  ta_name: "",
  ta_email: "",
  ta_linkedin_url: "",
  ta_phone: "",
  hiring_manager_name: "",
  hiring_manager_linkedin_url: "",
  linkedin_connection_sent: false,
  linkedin_message_sent: false,
  follow_up_date: "",
  last_contact_date: "",
  response_received_at: "",
  interview_date: "",
  created_at: new Date().toISOString().slice(0, 10),
  last_applied_at: "",
  application_source: "manual" as ApplicationSourceType,
  notes: "",
};
