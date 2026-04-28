import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, LogIn, Mail } from 'lucide-react'
import { useAuth } from '../../../store/authContext'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import './Login.css'

type LocationState = { from?: { pathname: string } }

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/'

  function handleSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '')
    if (!email) return
    login(email)
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout
      icon={<LogIn size={26} />}
      title="Welcome back"
      subtitle="Sign in to continue to TrialSim"
    >
      <form action={handleSubmit} className="auth-form login-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="email">Email</label>
          <div className="auth-input-wrap">
            <Mail size={18} className="auth-input-icon" aria-hidden />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
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
