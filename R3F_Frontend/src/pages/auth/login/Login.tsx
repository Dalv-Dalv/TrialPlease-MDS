import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, User as UserIcon, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../store/authContext'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import './Login.css'

type LocationState = { from?: { pathname: string } }

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const username = String(form.get('username') ?? '').trim()
    const password = String(form.get('password') ?? '')
    if (!username || !password) return

    try {
      setError(null)
      setPending(true)
      await login(username, password)
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Sign In" subtitle="Courtroom Access">
      {/* Tab switcher */}
      <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected="true" className="auth-tab auth-tab--active" disabled>
          Sign In
        </button>
        <Link to="/auth/register" role="tab" aria-selected="false" className="auth-tab">
          Register
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="auth-form login-form" noValidate>
        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            {error}
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="username">Username</label>
          <div className="auth-input-wrap">
            <UserIcon size={16} className="auth-input-icon" aria-hidden />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter username…"
              className="auth-input"
              required
              autoFocus
            />
          </div>
        </div>

        <PasswordInput name="password" label="Password" autoComplete="current-password" placeholder="Enter password…" />

        <button type="submit" className="auth-submit" disabled={pending} id="login-submit-btn">
          {pending ? (
            <><span className="auth-submit-spinner" aria-hidden />Signing in…</>
          ) : (
            <>Sign In<ArrowRight size={15} /></>
          )}
        </button>
      </form>

      <p className="auth-footer">
        No account?{' '}
        <Link to="/auth/register">Create one</Link>
      </p>
    </AuthLayout>
  )
}
