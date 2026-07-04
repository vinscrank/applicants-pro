import { apolloClient } from '@/lib/apollo-client'
import {
  CREATE_APPLICATION,
  DELETE_APPLICATION,
  UPDATE_APPLICATION,
} from '@/graphql/mutations'
import {
  applicationListRefetchQueries,
  APPLICATIONS_PAGE_INPUT,
  clientFetchPolicy,
} from '@/graphql/policies'
import { GET_APPLICATION, GET_APPLICATIONS_PAGE } from '@/graphql/queries'
import {
  filterApplicationsList,
  formToCreateInput,
  formToUpdateInput,
  gqlToApplication,
} from '@/lib/application-mapper'
import type { Application, ApplicationFormData } from '@/types'

export async function queryApplicationsPage(
  input: { limit?: number; offset?: number } = APPLICATIONS_PAGE_INPUT,
): Promise<Application[]> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATIONS_PAGE,
    variables: { input },
    fetchPolicy: clientFetchPolicy.list,
  })
  return (data?.applicationsPage?.items ?? []).map(gqlToApplication)
}

export async function queryApplication(id: number): Promise<Application> {
  const { data } = await apolloClient.query({
    query: GET_APPLICATION,
    variables: { id: String(id) },
    fetchPolicy: clientFetchPolicy.detail,
  })
  if (!data?.application) throw new Error('Application not found')
  return gqlToApplication(data.application)
}

export async function queryApplicationsFiltered(params?: {
  status?: string
  search?: string
  exclude_rejected?: boolean
  include_drafts?: boolean
}): Promise<Application[]> {
  return filterApplicationsList(await queryApplicationsPage(), params)
}

export async function mutateCreateApplication(
  data: ApplicationFormData,
): Promise<Application> {
  const { data: result } = await apolloClient.mutate({
    mutation: CREATE_APPLICATION,
    variables: { input: formToCreateInput(data) },
    refetchQueries: [...applicationListRefetchQueries],
  })
  if (!result?.createApplication) throw new Error('Create failed')
  return gqlToApplication(result.createApplication)
}

export async function mutateUpdateApplication(
  id: number,
  data: Partial<ApplicationFormData>,
): Promise<Application> {
  const { data: result } = await apolloClient.mutate({
    mutation: UPDATE_APPLICATION,
    variables: { input: formToUpdateInput(id, data) },
    refetchQueries: [...applicationListRefetchQueries],
  })
  if (!result?.updateApplication) throw new Error('Update failed')
  return gqlToApplication(result.updateApplication)
}

export async function mutateDeleteApplication(id: number): Promise<void> {
  await apolloClient.mutate({
    mutation: DELETE_APPLICATION,
    variables: { id: String(id) },
    refetchQueries: [...applicationListRefetchQueries],
  })
}
