import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail, UserPlus, User } from 'lucide-react'
import { useAuth } from '../../../store/authContext'
import { AuthLayout } from '../components/AuthLayout'
import { PasswordInput } from '../components/PasswordInput'
import './Register.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(formData: FormData) {
    const username = String(formData.get('username') ?? '')
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (!username || !email || !password || password !== confirmPassword) return
    try {
      await register(username, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <AuthLayout
      icon={<UserPlus size={26} />}
      title="Create your account"
      subtitle="Start exploring TrialSim in seconds"
    >
      <form action={handleSubmit} className="auth-form register-form">
        <div className="auth-field">
          <label className="auth-label" htmlFor="username">Username</label>
          <div className="auth-input-wrap">
            <User size={18} className="auth-input-icon" aria-hidden />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="johndoe"
              className="auth-input"
              required
            />
          </div>
        </div>

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
