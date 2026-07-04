import { GET_APPLICATIONS, GET_APPLICATION_STATS } from '@/graphql/queries'

export const APPLICATIONS_REFETCH = [
  { query: GET_APPLICATIONS },
  { query: GET_APPLICATION_STATS },
] as const

export const APPLICATIONS_LIST_FETCH_POLICY = 'cache-and-network' as const
export const APPLICATIONS_CACHE_FETCH_POLICY = 'cache-first' as const
