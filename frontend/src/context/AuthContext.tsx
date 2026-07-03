"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { apolloClient } from "@/lib/apollo-client"
import {
  clearAccessToken,
  fetchCurrentUser,
  getAccessToken,
  login as loginApi,
  register as registerApi,
} from "@/lib/auth"

type User = {
  id: number
  email: string
  active: boolean
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const currentUser = await fetchCurrentUser()
      setUser(currentUser)
    } catch {
      clearAccessToken()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  async function login(email: string, password: string) {
    await loginApi(email, password)
    await loadUser()
  }

  async function register(email: string, password: string) {
    await registerApi(email, password)
    await loadUser()
  }

  async function logout() {
    clearAccessToken()
    setUser(null)
    await apolloClient.clearStore()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
