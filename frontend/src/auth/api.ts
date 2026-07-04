import { authFetch, setAccessToken, clearAccessToken, browserApiBase, getAccessToken } from './http'
import type { AuthMeResponse, ProfileFormData, UserProfile } from './types'

type AuthTokenResponse = {
  accessToken?: string
  access_token?: string
}

type JavaUserResponse = {
  id: number
  email: string
  active?: boolean
  createdAt?: string
}

function readAccessToken(data: AuthTokenResponse): string {
  const token = data.accessToken ?? data.access_token
  if (!token) throw new Error('Missing access token')
  return token
}

function emptyProfile(user: JavaUserResponse): UserProfile {
  return {
    user_id: user.id,
    email: user.email,
    first_name: null,
    last_name: null,
    phone: null,
    city: null,
    country: null,
    address_line: null,
    headline: null,
    summary: null,
    linkedin_url: null,
    github_url: null,
    website_url: null,
    portfolio_url: null,
    nationality: null,
    work_authorization: null,
    years_experience: null,
    skills: null,
    has_cv: false,
    cv_filename: null,
    full_name: user.email,
    profile_complete: false,
    updated_at: null,
  }
}

const AUTH_PREFIX = '/api/v2/auth'

export const authApi = {
  register: async (email: string, password: string) => {
    const data = await authFetch<AuthTokenResponse>(`${AUTH_PREFIX}/register`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(readAccessToken(data))
    return data
  },
  login: async (email: string, password: string) => {
    const data = await authFetch<AuthTokenResponse>(`${AUTH_PREFIX}/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(readAccessToken(data))
    return data
  },
  logout: () => clearAccessToken(),
  me: async (): Promise<AuthMeResponse> => {
    const user = await authFetch<JavaUserResponse>(`${AUTH_PREFIX}/me`)
    const profile = await authFetch<UserProfile>(`${AUTH_PREFIX}/profile`).catch(() =>
      emptyProfile(user),
    )
    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.createdAt ?? new Date().toISOString(),
      },
      profile,
    }
  },
  updateProfile: (payload: Partial<ProfileFormData>) => {
    const body: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'years_experience') {
        body[key] = value === '' || value == null ? null : Number(value)
      } else {
        body[key] = value === '' ? null : value
      }
    }
    return authFetch<UserProfile>(`${AUTH_PREFIX}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },
  forgotPassword: (email: string) =>
    authFetch<{ message: string; reset_url?: string | null }>(`${AUTH_PREFIX}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: async (token: string, password: string) => {
    const data = await authFetch<AuthTokenResponse>(`${AUTH_PREFIX}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
    setAccessToken(readAccessToken(data))
    return data
  },
  uploadCv: async (file: File) => {
    const token = getAccessToken()
    const form = new FormData()
    form.append('file', file)
    const response = await fetch(`${browserApiBase()}${AUTH_PREFIX}/profile/cv`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      const detail = (error as { detail?: unknown }).detail
      throw new Error(typeof detail === 'string' ? detail : 'Upload failed')
    }
    return response.json() as Promise<UserProfile>
  },
  deleteCv: () =>
    authFetch<UserProfile>(`${AUTH_PREFIX}/profile/cv`, {
      method: 'DELETE',
    }),
}
