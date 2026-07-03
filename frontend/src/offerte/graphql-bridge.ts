import { apolloClient } from '@/lib/apollo-client'
import { PARSE_SEARCH_PROMPT, RUN_JOB_SEARCH } from '@/graphql/mutations'
import { EMPTY_COMMAND, DEFAULT_SEARCH_PREFERENCES } from './types'
import type { DefaultCommand, SearchCommand, SearchResult } from './types'
import { useJavaSearch } from '@/lib/env'

function buildCommandFromParse(
  prompt: string,
  parsed: {
    jobTitle: string | null
    location: string | null
    remote: boolean | null
    rawPrompt: string | null
  },
): SearchCommand {
  return {
    ...EMPTY_COMMAND,
    prompt_text: parsed.rawPrompt ?? prompt,
    locations: parsed.location ? [parsed.location] : [],
    location_rules: parsed.location
      ? [{ areas: [parsed.location], work_mode: parsed.remote ? 'remote' : 'any' }]
      : [],
    allowed_roles: parsed.jobTitle ? [parsed.jobTitle] : [],
    title_keywords: parsed.jobTitle ? [parsed.jobTitle] : [],
  }
}

function buildSearchResult(
  searchId: string,
  command: SearchCommand,
  offers: Array<{
    id: string
    title: string
    company: string
    location: string | null
    url: string
  }>,
): SearchResult {
  const mapped = offers.map((o) => ({
    id: o.id,
    company: o.company,
    role: o.title,
    apply_url: o.url,
    source: 'java',
    origin: 'website' as const,
    posted_at: null,
    language_requirement: null,
    seniority: 'unknown' as const,
    status: 'verified' as const,
    status_reason: '',
    location: o.location,
    verified_at: new Date().toISOString(),
    applied: false,
  }))
  return {
    id: Number(searchId) || undefined,
    command,
    preferences: DEFAULT_SEARCH_PREFERENCES,
    searched_at: new Date().toISOString(),
    total_found: mapped.length,
    verified_count: mapped.length,
    maybe_count: 0,
    rejected_count: 0,
    offers: mapped,
    offer_pool: mapped,
  }
}

export async function offerteGraphqlFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const method = options?.method ?? 'GET'
  const body = options?.body ? JSON.parse(String(options.body)) : null

  if (path === '/api/offerte/search/default' && method === 'GET') {
    const command: SearchCommand = { ...EMPTY_COMMAND, prompt_text: '' }
    return {
      command_text: '',
      command,
    } as T
  }

  if (path === '/api/offerte/search/parse' && method === 'POST') {
    const prompt = String(body?.prompt ?? body?.command_text ?? '')
    const { data } = await apolloClient.mutate({
      mutation: PARSE_SEARCH_PROMPT,
      variables: { prompt },
    })
    const parsed = data?.parseSearchPrompt
    if (!parsed) throw new Error('Parse failed')
    const command = buildCommandFromParse(prompt, parsed)
    return { command, used_llm: false } as T
  }

  if (path === '/api/offerte/search' && method === 'POST') {
    const command = (body?.command ?? EMPTY_COMMAND) as SearchCommand
    const { data } = await apolloClient.mutate({
      mutation: RUN_JOB_SEARCH,
      variables: {
        input: {
          jobTitle: command.allowed_roles?.[0] ?? command.title_keywords?.[0] ?? null,
          location: command.locations?.[0] ?? null,
          remote: command.location_rules?.[0]?.work_mode === 'remote',
        },
      },
    })
    const result = data?.runJobSearch
    if (!result) throw new Error('Search failed')
    return buildSearchResult(
      result.searchId,
      command,
      result.offers,
    ) as T
  }

  if (path === '/api/offerte/searches/latest' && method === 'GET') {
    return null as T
  }

  if (path === '/api/offerte/searches' && method === 'GET') {
    return [] as T
  }

  if (path.startsWith('/api/offerte/searches/') && method === 'GET') {
    throw new Error('Search history not available yet')
  }

  if (path === '/api/offerte/preferences') {
    if (method === 'GET') return DEFAULT_SEARCH_PREFERENCES as T
    if (method === 'PUT') return { ...DEFAULT_SEARCH_PREFERENCES, ...body } as T
  }

  throw new Error(`Endpoint not available: ${path}`)
}

export function shouldUseOfferteGraphql(path: string, method?: string): boolean {
  if (!useJavaSearch()) return false
  const m = method ?? 'GET'
  if (path === '/api/offerte/search/default' && m === 'GET') return true
  if (path === '/api/offerte/search/parse' && m === 'POST') return true
  if (path === '/api/offerte/search' && m === 'POST') return true
  if (path === '/api/offerte/searches/latest' && m === 'GET') return true
  if (path === '/api/offerte/searches' && m === 'GET') return true
  if (path === '/api/offerte/preferences') return true
  return false
}

export type { DefaultCommand }
