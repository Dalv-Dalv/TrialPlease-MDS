import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, User as UserIcon } from 'lucide-react'
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
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'

  async function handleSubmit(formData: FormData) {
    const username = String(formData.get('username') ?? '')
    const password = String(formData.get('password') ?? '')
    if (!username || !password) return
    
    try {
      setError(null)
      await login(username, password)
      navigate(redirectTo, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <AuthLayout
      icon={<LogIn size={26} />}
      title="Welcome back"
      subtitle="Sign in to continue to TrialSim"
    >
      <form action={handleSubmit} className="auth-form login-form">
        {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <div className="auth-field">
          <label className="auth-label" htmlFor="username">Username</label>
          <div className="auth-input-wrap">
            <UserIcon size={18} className="auth-input-icon" aria-hidden />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="admin"
              className="auth-input"
              required
            />
          </div>
        </div>

        <PasswordInput name="password" label="Password" autoComplete="current-password" />

        <button type="submit" className="auth-submit">
          Sign in
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="auth-footer">
        Don't have an account? <Link to="/auth/register">Create one</Link>
      </p>
    </AuthLayout>
  )
}
