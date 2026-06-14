import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import './PasswordInput.css'

type Props = {
  name: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  placeholder?: string
}

export function PasswordInput({ name, label, autoComplete, placeholder }: Props) {
  const [shown, setShown] = useState(false)
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={name}>{label}</label>
      <div className="auth-input-wrap">
        <Lock size={18} className="auth-input-icon" aria-hidden />
        <input
          id={name}
          name={name}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="auth-input"
          required
        />
        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
        >
          {shown ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}
