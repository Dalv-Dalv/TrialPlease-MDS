import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/authContext'
import './MainMenu.css'

export default function MainMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="home-shell">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="home-topbar">
        <button
          type="button"
          className="home-topbar-brand home-topbar-brand--link"
          onClick={() => navigate('/')}
          aria-label="Go to home"
        >
          <span className="home-topbar-seal" aria-hidden>⚖</span>
          <span className="home-topbar-name">TrialSim</span>
        </button>
        <nav className="home-topbar-nav">
          <span className="home-topbar-user">{user?.username}</span>
          <button type="button" className="home-btn home-btn--ghost" onClick={() => navigate('/profile')}>
            Profile
          </button>
          <button type="button" className="home-btn home-btn--ghost home-btn--danger" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <main className="home-hero">

        {/* Ambient corner glows */}
        <div className="home-glow home-glow--tl" aria-hidden />
        <div className="home-glow home-glow--br" aria-hidden />

        <div className="home-hero-inner">
          {/* top ornament */}
          <div className="home-ornament" aria-hidden>
            <div className="home-ornament-line" />
            <span className="home-ornament-diamond">◆</span>
            <div className="home-ornament-line" />
          </div>

          <span className="home-hero-seal" aria-hidden>⚖</span>
          <h1 className="home-hero-title">TrialSim</h1>
          <p className="home-hero-subtitle">Courtroom Simulation</p>

          {/* bottom ornament */}
          <div className="home-ornament" aria-hidden>
            <div className="home-ornament-line" />
            <span className="home-ornament-diamond">◆</span>
            <div className="home-ornament-line" />
          </div>

          <p className="home-hero-body">
            Step into the courtroom. Argue your case.<br />
            Master the art of litigation.
          </p>

          {/* ── Action cards ── */}
          <div className="home-actions">
            <button
              type="button"
              id="home-play-btn"
              className="home-action-card home-action-card--primary"
              onClick={() => navigate('/trial')}
            >
              <span className="home-action-icon" aria-hidden>▶</span>
              <div className="home-action-text">
                <span className="home-action-title">Begin Trial</span>
                <span className="home-action-sub">Enter the courtroom</span>
              </div>
            </button>

            <button
              type="button"
              id="home-profile-btn"
              className="home-action-card"
              onClick={() => navigate('/profile')}
            >
              <span className="home-action-icon" aria-hidden>◎</span>
              <div className="home-action-text">
                <span className="home-action-title">My Profile</span>
                <span className="home-action-sub">View past sessions</span>
              </div>
            </button>
          </div>

          {/* case count tagline */}
          <p className="home-tagline">
            Every argument matters. Every verdict counts.
          </p>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="home-footer">
        <p>Select <kbd>Begin Trial</kbd> to enter the courtroom</p>
      </footer>
    </div>
  )
}
