import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/authContext'
import { XpBar } from '../../components/xp-bar/XpBar'
import { useProfile } from './useProfile'
import type { TrialAction } from '../../store/flow-store/types'
import type { CaseHistoryEntry } from './types'
import '../main-menu/MainMenu.css'
import './Profile.css'

/* ── helpers ── */
function fmt(iso?: string | null) {
  if (!iso) return 'Unknown Date'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'Unknown Date'
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** The best possible score for a case is the highest score_points among its
 *  possible_choices (typically the score for the correct verdict). */
function maxScoreForCase(entry: CaseHistoryEntry): number {
  const choices = entry.case?.possible_choices ?? []
  if (choices.length === 0) return 0
  return choices.reduce((max, c) => Math.max(max, c.score_points ?? 0), 0)
}

function VerdictBadge({ correct }: { correct: boolean | null }) {
  if (correct === null) return <span className="pf-badge pf-badge--unknown">Undecided</span>
  return correct
    ? <span className="pf-badge pf-badge--win">Correct</span>
    : <span className="pf-badge pf-badge--loss">Incorrect</span>
}

/* ── Case card ── */
function CaseCard({ entry }: { entry: CaseHistoryEntry }) {
  const [open, setOpen] = useState(false)
  const { case: c, verdict_given, is_correct, created_at, score } = entry
  const maxScore = maxScoreForCase(entry)

  return (
    <article className={`pf-case ${open ? 'pf-case--open' : ''}`}>
      {/* ── summary row ── */}
      <button
        type="button"
        className="pf-case-summary"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="pf-case-left">
          <span className="pf-case-type">{c.case_type?.toUpperCase() || 'CASE'}</span>
          <span className="pf-case-name">{c.case_name}</span>
        </div>
        <div className="pf-case-right">
          {maxScore > 0 && (
            <span className="pf-case-score" title="Score earned out of best possible">
              <strong>{score ?? 0}</strong>
              <span className="pf-case-score-sep">/</span>
              {maxScore} <span className="pf-case-score-unit">pts</span>
            </span>
          )}
          <VerdictBadge correct={is_correct} />
          <span className="pf-case-date">{fmt(created_at)}</span>
          <span className="pf-case-chevron" aria-hidden>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* ── expanded detail ── */}
      {open && (
        <div className="pf-case-detail">

          {/* Parties */}
          <div className="pf-grid pf-grid--2">
            <div className="pf-box">
              <p className="pf-box-label">Plaintiff / Victim</p>
              <p className="pf-box-value">{c.victim}</p>
            </div>
            <div className="pf-box">
              <p className="pf-box-label">Defendant</p>
              <p className="pf-box-value">{c.defendant}</p>
            </div>
          </div>

          {/* Description */}
          <div className="pf-section">
            <div className="pf-section-hdr">
              <span className="pf-section-roman">I.</span>
              <h3 className="pf-section-title">Factual Summary</h3>
            </div>
            <div className="pf-section-rule" />
            <p className="pf-para">{c.case_description}</p>
          </div>

          {/* Police report */}
          {c.police_report && (
            <div className="pf-section">
              <div className="pf-section-hdr">
                <span className="pf-section-roman">II.</span>
                <h3 className="pf-section-title">Police Report</h3>
              </div>
              <div className="pf-section-rule" />
              <p className="pf-para">{c.police_report}</p>
            </div>
          )}

          {/* Evidence */}
          {c.evidence_items && c.evidence_items.length > 0 && (
            <div className="pf-section">
              <div className="pf-section-hdr">
                 <span className="pf-section-roman">III.</span>
                <h3 className="pf-section-title">Evidence ({c.evidence_items.length})</h3>
              </div>
              <div className="pf-section-rule" />
              <div className="pf-grid pf-grid--evidence">
                {c.evidence_items.map(ev => (
                  <div key={ev.id} className="pf-evidence-item">
                    <p className="pf-evidence-name">{ev.name}</p>
                    <p className="pf-evidence-desc">{ev.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Witnesses */}
          {c.witnesses && c.witnesses.length > 0 && (
            <div className="pf-section">
              <div className="pf-section-hdr">
                 <span className="pf-section-roman">IV.</span>
                <h3 className="pf-section-title">Witnesses ({c.witnesses.length})</h3>
              </div>
              <div className="pf-section-rule" />
              <div className="pf-witness-list">
                {c.witnesses.map(w => (
                  <div key={w.id} className="pf-witness">
                    <div className="pf-witness-hdr">
                      <span className="pf-witness-name">{w.name}</span>
                      <span className="pf-witness-role">{w.role}</span>
                    </div>
                    <p className="pf-para">{w.summary_statement}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript / Timeline */}
          {entry.transcript && entry.transcript.length > 0 && (
            <div className="pf-section">
              <div className="pf-section-hdr">
                <span className="pf-section-roman">V.</span>
                <h3 className="pf-section-title">Trial Transcript</h3>
              </div>
              <div className="pf-section-rule" />
              <div className="pf-timeline">
                {entry.transcript.map((act, i) => {
                  let side = 'system'
                  let title = ''
                  let body = ''
                  let isMajor = false

                  if (act.kind === 'opening_statement') { side = act.side; title = 'Opening Statement'; body = act.text; isMajor = true; }
                  else if (act.kind === 'closing_statement') { side = act.side; title = 'Closing Statement'; body = act.text; isMajor = true; }
                  else if (act.kind === 'evidence_argument') { side = act.side; title = `Argument: ${act.evidenceName}`; body = act.text; }
                  else if (act.kind === 'pass_evidence') { side = act.side; title = `Passes on ${act.evidenceName}`; body = ''; }
                  else if (act.kind === 'objection') { side = act.side; title = `Objection: ${act.reason}`; body = ''; }
                  else if (act.kind === 'objection_ruling') { side = 'judge'; title = `Ruling: ${act.ruling?.toUpperCase() || 'UNKNOWN'}`; body = ''; }
                  else if (act.kind === 'verdict') { side = 'judge'; title = `Verdict: ${act.verdict}`; body = ''; isMajor = true; }

                  return (
                    <div key={i} className={`pf-tl-item pf-tl-item--${side} ${isMajor ? 'pf-tl-item--major' : ''}`}>
                      <div className="pf-tl-dot" />
                      <div className="pf-tl-content">
                        <div className="pf-tl-header">
                          <span className={`pf-tl-side pf-tl-side--${side}`}>{side}</span>
                          <span className="pf-tl-label">{title}</span>
                        </div>
                        {body && <p className="pf-tl-body">{body}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Verdict row */}
          <div className="pf-verdict-row">
            <div className="pf-verdict-col">
              <p className="pf-box-label">Your Verdict</p>
              <p className="pf-verdict-value">{verdict_given ?? '—'}</p>
            </div>
            <div className="pf-verdict-col">
              <p className="pf-box-label">Correct Verdict</p>
              <p className="pf-verdict-value pf-verdict-value--correct">{c.correct_verdict}</p>
            </div>
            <div className="pf-verdict-col pf-verdict-col--outcome">
              <VerdictBadge correct={is_correct} />
            </div>
          </div>

          {/* Absolute truth (revealed post-game) */}
          {c.absolute_truth && (
            <div className="pf-truth">
              <p className="pf-truth-label">⚖ The Truth</p>
              <p className="pf-para pf-para--truth">{c.absolute_truth}</p>
            </div>
          )}

        </div>
      )}
    </article>
  )
}

/* ── Page ── */
export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const profileState = useProfile()

  const history = profileState.status === 'ok' && profileState.data?.history ? profileState.data.history : []
  const wins = history.filter(h => h.is_correct === true).length
  const losses = history.filter(h => h.is_correct === false).length
  const totalScore = history.reduce((sum, h) => sum + (h.score ?? 0), 0)
  const totalMaxScore = history.reduce((sum, h) => sum + maxScoreForCase(h), 0)

  return (
    <div className="home-shell">

      {/* ── Top bar ── */}
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
          <XpBar />
          <button
            type="button"
            className="home-topbar-user home-topbar-user--link"
            onClick={() => navigate('/profile')}
            aria-label="Open profile"
          >
            {user?.username}
          </button>
          {!isHome && (
            <button type="button" className="home-btn home-btn--ghost" onClick={() => navigate('/')}>
              Home
            </button>
          )}
          <button type="button" className="home-btn home-btn--ghost home-btn--danger" onClick={logout}>
            Sign out
          </button>
        </nav>
      </header>

      {/* ── Main ── */}
      <main className="profile-main">

        {/* Header */}
        <div className="profile-header">
          <div className="profile-rule-set" aria-hidden>
            <div className="profile-rule profile-rule--thick" />
            <div className="profile-rule profile-rule--thin" />
          </div>
          <h1 className="profile-title">Dossier</h1>
          <p className="profile-subtitle">{user?.username?.toUpperCase()}</p>
          <div className="profile-rule-set profile-rule-set--bottom" aria-hidden>
            <div className="profile-rule profile-rule--thin" />
            <div className="profile-rule profile-rule--thick" />
          </div>
        </div>

        {/* Stats strip */}
        {profileState.status === 'ok' && history.length > 0 && (
          <div className="pf-stats">
            <div className="pf-stat">
              <span className="pf-stat-value">{history.length}</span>
              <span className="pf-stat-label">Cases Tried</span>
            </div>
            <div className="pf-stat-divider" />
            <div className="pf-stat">
              <span className="pf-stat-value pf-stat-value--win">{wins}</span>
              <span className="pf-stat-label">Correct</span>
            </div>
            <div className="pf-stat-divider" />
            <div className="pf-stat">
              <span className="pf-stat-value pf-stat-value--loss">{losses}</span>
              <span className="pf-stat-label">Incorrect</span>
            </div>
            <div className="pf-stat-divider" />
            <div className="pf-stat">
              <span className="pf-stat-value">
                {history.length ? Math.round((wins / history.length) * 100) : 0}%
              </span>
              <span className="pf-stat-label">Win Rate</span>
            </div>
            {totalMaxScore > 0 && (
              <>
                <div className="pf-stat-divider" />
                <div className="pf-stat">
                  <span className="pf-stat-value">
                    {totalScore}
                    <span className="pf-stat-value-sub">/ {totalMaxScore}</span>
                  </span>
                  <span className="pf-stat-label">Score</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Case history section */}
        <section className="profile-section">
          <div className="profile-section-header">
            <span className="profile-section-roman">I.</span>
            <h2 className="profile-section-title">Case History</h2>
          </div>
          <div className="profile-section-rule" />

          {/* Loading */}
          {profileState.status === 'loading' && (
            <div className="pf-state-center">
              <span className="pf-spinner" aria-hidden />
              <p className="pf-state-text">Accessing archives…</p>
            </div>
          )}

          {/* Error */}
          {profileState.status === 'error' && (
            <div className="pf-state-center">
              <p className="pf-state-icon">⚠</p>
              <p className="pf-state-title">Connection Failed</p>
              <p className="pf-state-text">{profileState.message}</p>
            </div>
          )}

          {/* Empty */}
          {profileState.status === 'ok' && history.length === 0 && (
            <div className="profile-empty">
              <span className="profile-empty-icon" aria-hidden>⚖</span>
              <p className="profile-empty-title">No cases on record</p>
              <p className="profile-empty-body">
                Your trial history will appear here after your first session.
              </p>
              <button
                type="button"
                className="profile-start-btn"
                onClick={() => navigate('/trial')}
              >
                Begin First Trial
              </button>
            </div>
          )}

          {/* History list */}
          {profileState.status === 'ok' && history.length > 0 && (
            <div className="pf-case-list">
              {history.map(entry => (
                <CaseCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
