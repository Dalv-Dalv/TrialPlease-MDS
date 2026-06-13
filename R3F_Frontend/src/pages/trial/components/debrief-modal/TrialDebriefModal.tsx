import { useNavigate } from 'react-router-dom'
import { useFlow } from '../../../../store/flow-store/flowStore'
import './TrialDebriefModal.css'

export function TrialDebriefModal() {
  const navigate = useNavigate()
  const debrief = useFlow((s) => s.debrief)
  
  if (!debrief) return null

  const isCorrect = debrief.verdict_correct

  return (
    <div className="trial-debrief-modal-overlay">
      <div className="trial-debrief-modal">
        <h2 className="trial-debrief-title">Trial Concluded</h2>
        
        <div className={`trial-debrief-result-box trial-debrief-result-box--${isCorrect ? 'correct' : 'incorrect'}`}>
          <span className="trial-debrief-choice-label">Your Verdict</span>
          <p className="trial-debrief-choice-text">{debrief.user_verdict}</p>
          <span className="trial-debrief-status">
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </span>
        </div>

        {!isCorrect && (
          <div className="trial-debrief-correct-verdict">
            <span className="trial-debrief-correct-verdict-label">The Correct Verdict Was</span>
            <span className="trial-debrief-correct-verdict-text">{debrief.correct_verdict}</span>
          </div>
        )}

        <div className="trial-debrief-truth">
          <h3>The Absolute Truth</h3>
          <p>{debrief.absolute_truth}</p>
        </div>

        <div className="trial-debrief-actions">
          <button 
            type="button" 
            className="trial-debrief-btn trial-debrief-btn--ghost" 
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
          <button 
            type="button" 
            className="trial-debrief-btn" 
            onClick={() => window.location.reload()}
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  )
}
