import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../store/authContext'

export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

export function RedirectIfAuthed() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}
