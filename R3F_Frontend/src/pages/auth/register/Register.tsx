import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail, UserPlus } from 'lucide-react'
import { useAuth } from '../../../store/authContext'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import './Register.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  function handleSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (!email || !password || password !== confirmPassword) return
    register(email)
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      icon={<UserPlus size={26} />}
      title="Create your account"
      subtitle="Start exploring TrialSim in seconds"
    >
      <form action={handleSubmit} className="auth-form register-form">
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

        <PasswordInput name="password" label="Password" autoComplete="new-password" />
        <PasswordInput name="confirmPassword" label="Confirm password" autoComplete="new-password" />

        <button type="submit" className="auth-submit">
          Create account
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <Link to="/auth/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
