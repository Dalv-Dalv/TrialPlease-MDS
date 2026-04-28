import { createContext, useContext } from 'react'

export type User = {
  email: string
}

export type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string) => void
  register: (email: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
