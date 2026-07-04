import { apolloClient } from "@/lib/apollo-client";
import {
  CREATE_APPLICATION,
  DELETE_APPLICATION,
  UPDATE_APPLICATION,
} from "@/graphql/mutations";
import { GET_APPLICATION, GET_APPLICATIONS, GET_APPLICATION_STATS } from "@/graphql/queries";
import {
  filterApplicationsList,
  formToCreateInput,
  formToUpdateInput,
  gqlStatsToStats,
  gqlToApplication,
} from "@/lib/application-mapper";
import type { Application, ApplicationFormData, Stats } from "@/types";

const REFETCH = [{ query: GET_APPLICATIONS }, { query: GET_APPLICATION_STATS }];

async function readApplications(): Promise<Application[]> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATIONS,
    fetchPolicy: "network-only",
  });
  return (data?.applications ?? []).map(gqlToApplication);
}

export async function getApplications(params?: {
  status?: string;
  search?: string;
  exclude_rejected?: boolean;
  include_drafts?: boolean;
}): Promise<Application[]> {
  return filterApplicationsList(await readApplications(), params);
}

export async function getApplication(id: number): Promise<Application> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATION,
    variables: { id: String(id) },
    fetchPolicy: "network-only",
  });
  if (!data?.application) throw new Error("Application not found");
  return gqlToApplication(data.application);
}

export async function createApplication(
  data: ApplicationFormData,
): Promise<Application> {
  const { data: result } = await apolloClient.mutate({
    mutation: CREATE_APPLICATION,
    variables: { input: formToCreateInput(data) },
    refetchQueries: REFETCH,
  });
  if (!result?.createApplication) throw new Error("Create failed");
  return gqlToApplication(result.createApplication);
}

export async function updateApplication(
  id: number,
  data: Partial<ApplicationFormData>,
): Promise<Application> {
  const { data: result } = await apolloClient.mutate({
    mutation: UPDATE_APPLICATION,
    variables: { input: formToUpdateInput(id, data) },
    refetchQueries: REFETCH,
  });
  if (!result?.updateApplication) throw new Error("Update failed");
  return gqlToApplication(result.updateApplication);
}

export async function deleteApplication(id: number): Promise<void> {
  await apolloClient.mutate({
    mutation: DELETE_APPLICATION,
    variables: { id: String(id) },
    refetchQueries: REFETCH,
  });
}

export async function getApplicationStats(): Promise<Stats> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATION_STATS,
    fetchPolicy: "network-only",
  });
  if (!data?.applicationStats) {
    return {
      total: 0,
      by_status: {},
      follow_up_due: 0,
      linkedin_pending: 0,
      applied_today: 0,
      daily_average: 0,
    };
  }
  return gqlStatsToStats(data.applicationStats);
}

export async function getCompanyNames(): Promise<string[]> {
  const apps = await readApplications();
  return [...new Set(apps.map((a) => a.company_name))].sort();
}
