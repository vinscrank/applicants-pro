import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from './api'
import { getAccessToken } from './http'
import { clearOfferteListSession, setActiveUserId } from '../offerte/offerteListSession'
import type { AuthMeResponse, UserProfile } from './types'
import { apolloClient } from '@/lib/apollo-client'

interface AuthContextValue {
  loading: boolean
  user: AuthMeResponse['user'] | null
  profile: UserProfile | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  setProfile: (profile: UserProfile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<AuthMeResponse['user'] | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const refresh = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      setProfile(null)
      setActiveUserId(null)
      clearOfferteListSession()
      setLoading(false)
      return
    }
    try {
      const data = await authApi.me()
      setUser(data.user)
      setProfile(data.profile)
      setActiveUserId(data.user.id)
    } catch {
      authApi.logout()
      setUser(null)
      setProfile(null)
      setActiveUserId(null)
      clearOfferteListSession()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password)
    await refresh()
  }, [refresh])

  const register = useCallback(async (email: string, password: string) => {
    await authApi.register(email, password)
    await refresh()
  }, [refresh])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
    setProfile(null)
    setActiveUserId(null)
    clearOfferteListSession()
    void apolloClient.clearStore()
  }, [])

  const value = useMemo(
    () => ({ loading, user, profile, refresh, login, register, logout, setProfile }),
    [loading, user, profile, refresh, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
