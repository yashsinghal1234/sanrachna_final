import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useTeamProjectStore } from '@/store/useTeamProjectStore'

export type Role = 'owner' | 'engineer' | 'worker'

export interface User {
  id: string
  name: string
  emailOrPhone: string
  /** Set when account is backed by Mongo auth (signup / login). */
  phone?: string
  role: Role | null
}

interface AuthContextValue {
  user: User | null
  role: Role | null
  isAuthed: boolean
  token: string | null
  login: (payload: { user: User; token: string | null }) => void
  setRole: (role: Role) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'sanrachna_v2_auth'

type PersistedAuth = {
  user: User
  token: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PersistedAuth | User
      if (parsed && typeof parsed === 'object' && 'user' in parsed) {
        const p = parsed as PersistedAuth
        if (p?.user?.id && p?.user?.emailOrPhone) {
          setUser(p.user)
          setToken(typeof p.token === 'string' ? p.token : null)
        }
      } else {
        const legacy = parsed as User
        if (legacy?.id && legacy?.emailOrPhone) {
          setUser(legacy)
          setToken(null)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const persist = (next: PersistedAuth | null) => {
    try {
      if (!next) window.localStorage.removeItem(STORAGE_KEY)
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const login = useCallback((payload: { user: User; token: string | null }) => {
    setUser(payload.user)
    setToken(payload.token)
    persist({ user: payload.user, token: payload.token })
  }, [])

  const setRole = useCallback((role: Role) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, role }
      persist({ user: next, token })
      return next
    })
  }, [token])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    persist(null)
    useTeamProjectStore.getState().reset()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      role: user?.role ?? null,
      isAuthed: Boolean(user),
      token,
      login,
      setRole,
      logout,
    }
  }, [user, token, login, setRole, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

