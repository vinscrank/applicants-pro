import type { FetchPolicy, WatchQueryFetchPolicy } from '@apollo/client'
import { GET_APPLICATIONS_PAGE, GET_APPLICATION_STATS } from '@/graphql/queries'

export const APPLICATIONS_PAGE_INPUT = { limit: 500, offset: 0 } as const

export const applicationListRefetchQueries = [
  { query: GET_APPLICATIONS_PAGE, variables: { input: APPLICATIONS_PAGE_INPUT } },
  { query: GET_APPLICATION_STATS },
] as const

export const watchFetchPolicy = {
  list: 'cache-and-network' as WatchQueryFetchPolicy,
  detail: 'cache-first' as WatchQueryFetchPolicy,
} as const

export const clientFetchPolicy = {
  list: 'cache-first' as FetchPolicy,
  detail: 'cache-first' as FetchPolicy,
} as const
