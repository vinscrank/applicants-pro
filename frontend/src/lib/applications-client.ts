import { apolloClient } from '@/lib/apollo-client'
import {
  CREATE_APPLICATION,
  DELETE_APPLICATION,
  UPDATE_APPLICATION,
} from '@/graphql/mutations'
import {
  APPLICATIONS_CACHE_FETCH_POLICY,
  APPLICATIONS_REFETCH,
} from '@/graphql/applications'
import { GET_APPLICATION, GET_APPLICATIONS } from '@/graphql/queries'
import {
  filterApplicationsList,
  formToCreateInput,
  formToUpdateInput,
  gqlToApplication,
} from '@/lib/application-mapper'
import type { Application, ApplicationFormData } from '@/types'

async function readAllApplications(): Promise<Application[]> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATIONS,
    fetchPolicy: APPLICATIONS_CACHE_FETCH_POLICY,
  })
  return (data?.applications ?? []).map(gqlToApplication)
}

export async function fetchApplications(params?: {
  status?: string
  search?: string
  exclude_rejected?: boolean
  include_drafts?: boolean
}): Promise<Application[]> {
  return filterApplicationsList(await readAllApplications(), params)
}

export async function fetchApplication(id: number): Promise<Application> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATION,
    variables: { id: String(id) },
    fetchPolicy: APPLICATIONS_CACHE_FETCH_POLICY,
  })
  if (!data?.application) throw new Error('Application not found')
  return gqlToApplication(data.application)
}

export async function createApplication(
  data: ApplicationFormData,
): Promise<Application> {
  const { data: result } = await apolloClient.mutate({
    mutation: CREATE_APPLICATION,
    variables: { input: formToCreateInput(data) },
    refetchQueries: [...APPLICATIONS_REFETCH],
  })
  if (!result?.createApplication) throw new Error('Create failed')
  return gqlToApplication(result.createApplication)
}

export async function updateApplication(
  id: number,
  data: Partial<ApplicationFormData>,
): Promise<Application> {
  const { data: result } = await apolloClient.mutate({
    mutation: UPDATE_APPLICATION,
    variables: { input: formToUpdateInput(id, data) },
    refetchQueries: [...APPLICATIONS_REFETCH],
  })
  if (!result?.updateApplication) throw new Error('Update failed')
  return gqlToApplication(result.updateApplication)
}

export async function deleteApplication(id: number): Promise<void> {
  await apolloClient.mutate({
    mutation: DELETE_APPLICATION,
    variables: { id: String(id) },
    refetchQueries: [...APPLICATIONS_REFETCH],
  })
}
