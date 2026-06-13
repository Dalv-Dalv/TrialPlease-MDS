import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/authContext'
import './Profile.css'
import { ArrowLeft, User, LogOut } from 'lucide-react'

type CaseHistory = {
  id: number
  case: { case_name: string; case_description: string; correct_verdict: string }
  transcript: any[]
  verdict_given: string
  is_correct: boolean
  created_at: string
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [histories, setHistories] = useState<CaseHistory[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseHistory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (!user?.token) return
      try {
        const res = await fetch('http://localhost:8000/api/profile/', {
          headers: { 'Authorization': `Token ${user.token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setHistories(data.history)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  function handleLogout() {
    logout()
    navigate('/')
  }

  if (loading) return <div className="profile-container loading">Loading...</div>

  return (
    <div className="profile-container">
      <header className="profile-header">
        <Link to="/" className="back-btn"><ArrowLeft size={20} /> Back to Game</Link>
        <div className="profile-user-info">
          <User size={24} />
          <span>{user?.username}</span>
          <button onClick={handleLogout} className="logout-btn" aria-label="Log out"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="profile-content">
        <section className="history-list">
          <h2>Your Cases History</h2>
          {histories.length === 0 ? (
            <p className="no-history">You haven't completed any cases yet.</p>
          ) : (
            <ul>
              {histories.map(h => (
                <li key={h.id} className={selectedCase?.id === h.id ? 'active' : ''} onClick={() => setSelectedCase(h)}>
                  <div className="history-card">
                    <h3>{h.case.case_name}</h3>
                    <p className={`verdict ${h.is_correct ? 'correct' : 'incorrect'}`}>
                      {h.is_correct ? 'Won' : 'Lost'} - {new Date(h.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="case-details">
          {selectedCase ? (
            <div className="case-file">
              <h2>Case File: {selectedCase.case.case_name}</h2>
              <div className="case-summary">
                <p><strong>Description:</strong> {selectedCase.case.case_description}</p>
                <p><strong>Your Verdict:</strong> {selectedCase.verdict_given}</p>
                <p><strong>Correct Verdict:</strong> {selectedCase.case.correct_verdict}</p>
              </div>
              
              <h3>Trial Transcript</h3>
              <div className="transcript">
                {selectedCase.transcript.map((line, idx) => (
                  <div key={idx} className={`transcript-line ${line.side || line.role || 'system'}`}>
                    <strong>{line.side || line.name || line.role || 'System'}: </strong>
                    <span>{line.dialogue || line.action || JSON.stringify(line)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-details">
              <p>Select a case from the history to view its dossier.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
