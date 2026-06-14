import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, User as UserIcon, AlertCircle, Mail } from 'lucide-react'
import { useAuth } from '../../../store/authContext'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import { GoogleButton } from '../components/GoogleButton'
import './Register.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const username = String(form.get('username') ?? '').trim()
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (!username || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      setError(null)
      setPending(true)
      await register(username, email, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout title="Register" subtitle="Create Account">
      {/* Tab switcher */}
      <div className="auth-tabs" role="tablist">
        <Link to="/auth/login" role="tab" aria-selected="false" className="auth-tab">
          Sign In
        </Link>
        <button role="tab" aria-selected="true" className="auth-tab auth-tab--active" disabled>
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="auth-form register-form" noValidate>
        {error && (
          <div className="auth-error" role="alert">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            {error}
          </div>
        )}

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-username">Username</label>
          <div className="auth-input-wrap">
            <UserIcon size={16} className="auth-input-icon" aria-hidden />
            <input
              id="reg-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Choose a username…"
              className="auth-input"
              required
              autoFocus
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-label" htmlFor="reg-email">Email</label>
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" aria-hidden />
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email…"
              className="auth-input"
              required
            />
          </div>
        </div>

        <PasswordInput name="password" label="Password" autoComplete="new-password" />

        <button type="submit" className="auth-submit" disabled={pending} id="register-submit-btn">
          {pending ? (
            <><span className="auth-submit-spinner" aria-hidden />Creating…</>
          ) : (
            <>Create Account<ArrowRight size={15} /></>
          )}
        </button>
      </form>

      <GoogleButton redirectTo="/" />

      <p className="auth-footer">
        Already registered?{' '}
        <Link to="/auth/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
