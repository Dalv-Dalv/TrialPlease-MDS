import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type User } from './authContext'

const STORAGE_KEY = 'auth.user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser())

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  // On first mount, if a token was restored from localStorage, fetch fresh XP.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user?.token) void refreshUser()
    // intentionally run only once on mount
  }, [])

  const fetchUserMeta = useCallback(async (token: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/profile/', {
        headers: { Authorization: `Token ${token}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.user ?? null
    } catch {
      return null
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('http://localhost:8000/api/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      throw new Error('Login failed. Please check your credentials.')
    }

    const data = await res.json()
    const meta = await fetchUserMeta(data.token)
    setUser({
      username,
      token: data.token,
      xp: meta?.xp ?? 0,
      xp_label: meta?.xp_label,
      xp_current_tier_min: meta?.xp_current_tier_min,
      xp_next_tier_min: meta?.xp_next_tier_min ?? null,
    })
  }, [fetchUserMeta])

  const refreshUser = useCallback(async () => {
    if (!user?.token) return
    const meta = await fetchUserMeta(user.token)
    if (!meta) return
    setUser((prev) =>
      prev
        ? {
            ...prev,
            xp: meta.xp ?? prev.xp ?? 0,
            xp_label: meta.xp_label ?? prev.xp_label,
            xp_current_tier_min: meta.xp_current_tier_min ?? prev.xp_current_tier_min,
            xp_next_tier_min: meta.xp_next_tier_min ?? null,
          }
        : prev,
    )
  }, [user?.token, fetchUserMeta])

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await fetch('http://localhost:8000/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      console.error("Register Error:", errorData)
      throw new Error('Registration failed. Username or email might be taken.')
    }

    const data = await res.json()
    setUser({ username: data.user.username, token: data.token })
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await fetch('http://localhost:8000/api/auth/google/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.error ?? 'Google sign-in failed')
    }

    const data = await res.json()
    const meta = await fetchUserMeta(data.token)
    setUser({
      username: data.user.username,
      token: data.token,
      xp: meta?.xp ?? 0,
      xp_label: meta?.xp_label,
      xp_current_tier_min: meta?.xp_current_tier_min,
      xp_next_tier_min: meta?.xp_next_tier_min ?? null,
    })
  }, [fetchUserMeta])

  const logout = useCallback(() => setUser(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, login, loginWithGoogle, register, logout, refreshUser }),
    [user, login, loginWithGoogle, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
