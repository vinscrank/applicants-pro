export function publicApiUrl(): string {
  const java = process.env.NEXT_PUBLIC_JAVA_API_URL?.replace(/\/+$/, '')
  if (java) return java
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? ''
}

export function publicBackendUrl(): string {
  const api = publicApiUrl()
  if (api) return api
  return (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '')
}

export function publicGraphqlUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/+$/, '') ||
    `${publicBackendUrl()}/graphql`
  )
}

export function useJavaApplications(): boolean {
  return process.env.NEXT_PUBLIC_USE_JAVA_APPLICATIONS !== 'false'
}

export function useJavaSearch(): boolean {
  return process.env.NEXT_PUBLIC_USE_JAVA_SEARCH !== 'false'
}

export function publicExtensionId(): string {
  return process.env.NEXT_PUBLIC_EXTENSION_ID ?? ''
}
