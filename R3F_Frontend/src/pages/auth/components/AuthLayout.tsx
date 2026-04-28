import { type ReactNode } from 'react'
import './AuthLayout.css'

type Props = {
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ icon, title, subtitle, children }: Props) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon-badge" aria-hidden>{icon}</div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
