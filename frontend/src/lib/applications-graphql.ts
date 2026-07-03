import { apolloClient } from "@/lib/apollo-client";
import {
  CREATE_APPLICATION,
  DELETE_APPLICATION,
  UPDATE_APPLICATION,
  type CreateApplicationInput,
  type UpdateApplicationInput,
} from "@/graphql/mutations";
import {
  GET_APPLICATIONS,
  GET_APPLICATION_STATS,
  type GqlApplication,
} from "@/graphql/queries";
import type {
  Application,
  ApplicationFormData,
  Stats,
  StatusType,
} from "@/types";

function gqlToApplication(row: GqlApplication): Application {
  const now = new Date().toISOString();
  return {
    id: Number(row.id),
    company_name: row.companyName,
    job_title: row.jobTitle,
    job_url: row.jobUrl,
    company_website: null,
    company_linkedin_url: null,
    location: row.location,
    status: row.status as StatusType,
    priority: (row.priority as Application["priority"]) ?? "medium",
    remote_type: null,
    application_method: null,
    application_method_other: null,
    salary_min: null,
    salary_max: null,
    salary_currency: "EUR",
    visa_sponsorship: null,
    ta_name: null,
    ta_email: null,
    ta_linkedin_url: null,
    ta_phone: null,
    hiring_manager_name: null,
    hiring_manager_linkedin_url: null,
    linkedin_connection_sent: false,
    linkedin_message_sent: false,
    follow_up_date: null,
    last_contact_date: null,
    response_received_at: null,
    interview_date: null,
    created_at: row.createdAt ?? now,
    last_applied_at: null,
    application_source: "manual",
    notes: null,
    updated_at: now,
  };
}

function formToCreateInput(data: ApplicationFormData): CreateApplicationInput {
  return {
    companyName: data.company_name,
    jobTitle: data.job_title,
    jobUrl: data.job_url || null,
    location: data.location || null,
    status: data.status || "applied",
    priority: data.priority || "medium",
  };
}

function formToUpdateInput(
  id: number,
  data: Partial<ApplicationFormData>,
): UpdateApplicationInput {
  const input: UpdateApplicationInput = { id: String(id) };
  if (data.company_name !== undefined) input.companyName = data.company_name;
  if (data.job_title !== undefined) input.jobTitle = data.job_title;
  if (data.job_url !== undefined) input.jobUrl = data.job_url || null;
  if (data.location !== undefined) input.location = data.location || null;
  if (data.status !== undefined) input.status = data.status;
  if (data.priority !== undefined) input.priority = data.priority;
  return input;
}

async function fetchApplications(): Promise<Application[]> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATIONS,
    fetchPolicy: "network-only",
  });
  return (data?.applications ?? []).map(gqlToApplication);
}

export const applicationsGraphql = {
  getApplications: async (params?: {
    status?: string;
    search?: string;
    exclude_rejected?: boolean;
    include_drafts?: boolean;
  }): Promise<Application[]> => {
    let apps = await fetchApplications();
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
  },

  getApplication: async (id: number): Promise<Application> => {
    const apps = await fetchApplications();
    const app = apps.find((a) => a.id === id);
    if (!app) throw new Error("Application not found");
    return app;
  },

  createApplication: async (data: ApplicationFormData): Promise<Application> => {
    const { data: result } = await apolloClient.mutate({
      mutation: CREATE_APPLICATION,
      variables: { input: formToCreateInput(data) },
      refetchQueries: [{ query: GET_APPLICATIONS }],
    });
    if (!result?.createApplication) throw new Error("Create failed");
    return gqlToApplication(result.createApplication);
  },

  updateApplication: async (
    id: number,
    data: Partial<ApplicationFormData>,
  ): Promise<Application> => {
    const { data: result } = await apolloClient.mutate({
      mutation: UPDATE_APPLICATION,
      variables: { input: formToUpdateInput(id, data) },
      refetchQueries: [{ query: GET_APPLICATIONS }],
    });
    if (!result?.updateApplication) throw new Error("Update failed");
    return gqlToApplication(result.updateApplication);
  },

  deleteApplication: async (id: number): Promise<void> => {
    await apolloClient.mutate({
      mutation: DELETE_APPLICATION,
      variables: { id: String(id) },
      refetchQueries: [{ query: GET_APPLICATIONS }],
    });
  },

  getStats: async (): Promise<Stats> => {
    const { data } = await apolloClient.query({
      query: GET_APPLICATION_STATS,
      fetchPolicy: "network-only",
    });
    const s = data?.applicationStats;
    if (!s) {
      return {
        total: 0,
        by_status: {},
        follow_up_due: 0,
        linkedin_pending: 0,
        applied_today: 0,
        daily_average: 0,
      };
    }
    return {
      total: s.total,
      by_status: {
        applied: s.applied,
        interview: s.interview,
        offer: s.offer,
        rejected: s.rejected,
      },
      follow_up_due: 0,
      linkedin_pending: 0,
      applied_today: 0,
      daily_average: 0,
    };
  },

  getCompanyNames: async (): Promise<string[]> => {
    const apps = await fetchApplications();
    return [...new Set(apps.map((a) => a.company_name))].sort();
  },
};
