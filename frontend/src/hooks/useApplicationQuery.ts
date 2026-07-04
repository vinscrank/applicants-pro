'use client'

import { useQuery } from '@apollo/client/react'
import { APPLICATIONS_CACHE_FETCH_POLICY } from '@/graphql/applications'
import { GET_APPLICATION } from '@/graphql/queries'
import { gqlToApplication } from '@/lib/application-mapper'

export function useApplicationQuery(applicationId: number, enabled = true) {
  const { data, loading, error } = useQuery(GET_APPLICATION, {
    skip: !enabled || !applicationId,
    variables: { id: String(applicationId) },
    fetchPolicy: APPLICATIONS_CACHE_FETCH_POLICY,
  })

  return {
    application: data?.application ? gqlToApplication(data.application) : null,
    loading,
    error: error?.message ?? null,
  }
}
