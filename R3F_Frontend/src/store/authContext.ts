import { createContext, useContext } from 'react'

export type User = {
  username: string
  token: string
  xp?: number
  xp_label?: string
  xp_current_tier_min?: number
  xp_next_tier_min?: number | null
}

export type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  /** Pull the latest user info (XP etc.) from the backend. */
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
