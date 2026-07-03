import { authFetch } from '../auth/http'

export interface VectorStatus {
  enabled: boolean
  configured: boolean
  embedding_model: string
  features: string[]
}

export interface AssistantSource {
  title: string
  doc_type: string
  source_key: string
}

export interface AssistantResponse {
  answer: string
  sources: AssistantSource[]
  context_count: number
}

export interface SimilarJobItem {
  title: string
  doc_type: string
  source_key: string
  snippet: string
  similarity_score: number
}

export const vectorApi = {
  status(): Promise<VectorStatus> {
    return authFetch('/api/vector/status')
  },

  reindex(): Promise<{ profile_indexed: boolean; applications_indexed: number }> {
    return authFetch('/api/vector/reindex', { method: 'POST' })
  },

  ask(question: string): Promise<AssistantResponse> {
    return authFetch('/api/vector/assistant/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
  },

  similarJobs(params: { url?: string; role?: string; company?: string; limit?: number }): Promise<{ items: SimilarJobItem[] }> {
    const query = new URLSearchParams()
    if (params.url) query.set('url', params.url)
    if (params.role) query.set('role', params.role)
    if (params.company) query.set('company', params.company)
    if (params.limit != null) query.set('limit', String(params.limit))
    const qs = query.toString()
    return authFetch(`/api/vector/similar-jobs${qs ? `?${qs}` : ''}`)
  },
}
