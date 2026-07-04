'use client'

import { useQuery } from '@apollo/client/react'
import { watchFetchPolicy } from '@/graphql/policies'
import { GET_APPLICATION } from '@/graphql/queries'
import { gqlToApplication } from '@/lib/application-mapper'

export function useApplicationQuery(applicationId: number, enabled = true) {
  const { data, loading, error } = useQuery(GET_APPLICATION, {
    skip: !enabled || !applicationId,
    variables: { id: String(applicationId) },
    fetchPolicy: watchFetchPolicy.detail,
  })

  return {
    application: data?.application ? gqlToApplication(data.application) : null,
    loading,
    error: error?.message ?? null,
  }
}
