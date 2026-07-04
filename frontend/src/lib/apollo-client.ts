import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client'
import { SetContextLink } from '@apollo/client/link/context'
import { getAccessToken } from '@/auth/http'
import { publicGraphqlUrl } from '@/lib/env'

const httpLink = new HttpLink({
  uri: publicGraphqlUrl(),
})

const authLink = new SetContextLink((prevContext) => {
  const token = getAccessToken()
  return {
    headers: {
      ...prevContext.headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          applicationsPage: {
            keyArgs: ['input'],
          },
          applicationTasks: {
            keyArgs: ['scope'],
          },
        },
      },
      Application: {
        keyFields: ['id'],
      },
    },
  }),
})
