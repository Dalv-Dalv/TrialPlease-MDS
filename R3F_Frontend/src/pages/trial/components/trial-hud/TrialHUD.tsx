import { useEffect, useState } from 'react'
import {
  Gavel,
  ShieldCheck,
  ShieldX,
  Play,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useFlow } from '../../../../store/flow-store/flowStore'
import type { Side } from '../../../../store/flow-store/types'
import { useLawyers } from '../../../../store/lawyer-store/lawyerStore'
import { useCaseGenerator } from '../../../../store/case-generator-store/caseGeneratorContext'
import { HUD_STRINGS, phaseLabel } from '../../../../utils/strings'
import './TrialHUD.css'

export function TrialHUD() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(true)
  const [isCardOpen, setIsCardOpen] = useState(true)
  const phase = useFlow((s) => s.phase)
  const activeSpeaker = useFlow((s) => s.activeSpeaker)
  const currentEvidenceIndex = useFlow((s) => s.currentEvidenceIndex)
  const pendingObjection = useFlow((s) => s.pendingObjection)
  const awaitingUser = useFlow((s) => s.awaitingUser)
  const transcript = useFlow((s) => s.transcript)
  const recentSpeech = useFlow((s) => s.recentSpeech)

  const { caseInfo } = useCaseGenerator()
  const defenseState = useLawyers((s) => s.defense)
  const prosecutionState = useLawyers((s) => s.prosecution)

  const evidenceCount = caseInfo?.evidence_items.length ?? 0
  const currentEvidenceName =
    currentEvidenceIndex != null ? caseInfo?.evidence_items[currentEvidenceIndex]?.name : undefined

  const speakerSide: Side | null =
    activeSpeaker === 'defense' || activeSpeaker === 'prosecution' ? activeSpeaker : null
  const speakerState =
    speakerSide === 'defense' ? defenseState : speakerSide === 'prosecution' ? prosecutionState : null
  const speakerName =
    activeSpeaker === 'judge'
      ? HUD_STRINGS.speaker.judgeName
      : speakerState?.persona.name ?? null
  const speakerTagLabel = speakerSide
    ? HUD_STRINGS.speaker[speakerSide]
    : HUD_STRINGS.speaker.judge

  const speechText = speakerState?.isThinking
    ? HUD_STRINGS.speech.thinking
    : speakerState?.lastUtterance ?? null

  const onStart = () => {
    if (!caseInfo) return
    useFlow.getState().startTrial(caseInfo)
  }
  const onAdvance = () => {
    void useFlow.getState().advanceTurn()
  }
  const onSustain = () => useFlow.getState().approveObjection()
  const onOverrule = () => useFlow.getState().opposeObjection()
  const onVerdict = (choice: string) => {
    void useFlow.getState().deliverVerdict(choice)
  }

  const isAITurnPhase =
    phase === 'opening_prosecution' ||
    phase === 'opening_defense' ||
    phase === 'evidence_debate' ||
    phase === 'closing_prosecution' ||
    phase === 'closing_defense'
  const isThinking = defenseState.isThinking || prosecutionState.isThinking

  const showStart = phase === 'pre_trial' && caseInfo != null
  const showAdvance = isAITurnPhase && awaitingUser == null
  const showRuling = awaitingUser === 'objection_ruling' && pendingObjection != null
  const showVerdict = awaitingUser === 'verdict' && caseInfo != null

  // Card shows a fresh utterance when not thinking — drop the latest history
  // entry so it isn't rendered twice.
  const cardShowsSpeech = speakerState?.lastUtterance != null && !speakerState.isThinking
  const historyEntries = cardShowsSpeech ? recentSpeech.slice(0, -1) : recentSpeech

  // Enter triggers Continue when it's available and no AI turn is in flight.
  useEffect(() => {
    if (!showAdvance || isThinking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const target = e.target as HTMLElement | null
      // Don't hijack Enter from form fields / contenteditable surfaces.
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      void useFlow.getState().advanceTurn()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAdvance, isThinking])

  return (
    <div className="trial-hud" aria-live="polite">
      <div className="trial-hud-phase">
        {phaseLabel(phase, currentEvidenceIndex, evidenceCount, currentEvidenceName)}
      </div>

      <div className="trial-hud-stack">
        {historyEntries.length > 0 && (
          <div
            className={`trial-hud-history ${isHistoryOpen ? '' : 'trial-hud-history--collapsed'}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="trial-hud-history-header">
              {!isHistoryOpen && (
                <span className="trial-hud-history-title">{HUD_STRINGS.history.title}</span>
              )}
              <button
                type="button"
                className="trial-hud-toggle"
                onClick={() => setIsHistoryOpen((open) => !open)}
                aria-label={isHistoryOpen ? 'Collapse history' : 'Expand history'}
                aria-expanded={isHistoryOpen}
              >
                {isHistoryOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>

            {isHistoryOpen && (
              <div className="trial-hud-history-list">
                {historyEntries.map((item) => (
                  <div key={item.id} className={`trial-hud-history-item trial-hud-history-item--${item.side}`}>
                    <span
                      className={`trial-hud-history-tag trial-hud-history-tag--${item.side}`}
                    >
                      {HUD_STRINGS.speaker[item.side]}
                    </span>
                    <span className="trial-hud-history-text">{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className="trial-hud-card"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="trial-hud-card-header">
            {speakerName ? (
              <div className="trial-hud-speaker">
                <span className={`trial-hud-speaker-tag trial-hud-speaker-tag--${speakerSide ?? 'judge'}`}>
                  {speakerTagLabel}
                </span>
                <span className="trial-hud-speaker-name">{speakerName}</span>
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="trial-hud-toggle"
              onClick={() => setIsCardOpen((open) => !open)}
              aria-label={isCardOpen ? 'Collapse current speech' : 'Expand current speech'}
              aria-expanded={isCardOpen}
            >
              {isCardOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>

          {isCardOpen && (
            <p className={`trial-hud-speech ${speakerState?.isThinking ? 'trial-hud-speech--thinking' : ''}`}>
              {speechText ?? (phase === 'pre_trial' ? HUD_STRINGS.speech.preTrialHint : HUD_STRINGS.speech.empty)}
            </p>
          )}

          {showRuling && (
            <div className="trial-hud-ruling">
              <div className="trial-hud-ruling-label">
                <Gavel size={14} />
                <span>
                  {HUD_STRINGS.ruling.prefix}{' '}
                  <strong>{HUD_STRINGS.speaker[pendingObjection.side]}</strong> {HUD_STRINGS.ruling.separator}{' '}
                  <em>{pendingObjection.reason}</em>
                </span>
              </div>
              <div className="trial-hud-actions">
                <button type="button" className="trial-hud-btn trial-hud-btn--sustain" onClick={onSustain}>
                  <ShieldCheck size={16} />
                  {HUD_STRINGS.ruling.sustain}
                </button>
                <button type="button" className="trial-hud-btn trial-hud-btn--overrule" onClick={onOverrule}>
                  <ShieldX size={16} />
                  {HUD_STRINGS.ruling.overrule}
                </button>
              </div>
            </div>
          )}

          {showVerdict && (
            <div className="trial-hud-verdict">
              <div className="trial-hud-verdict-prompt">{HUD_STRINGS.verdict.prompt}</div>
              <div className="trial-hud-actions trial-hud-actions--wrap">
                {caseInfo!.possible_choices.map((choice) => (
                  <button
                    key={choice.verdict_option}
                    type="button"
                    className="trial-hud-btn trial-hud-btn--primary"
                    onClick={() => onVerdict(choice.verdict_option)}
                  >
                    {choice.verdict_option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showStart && (
            <div className="trial-hud-actions">
              <button type="button" className="trial-hud-btn trial-hud-btn--primary" onClick={onStart}>
                <Play size={16} />
                {HUD_STRINGS.start.button}
              </button>
            </div>
          )}

          {showAdvance && (
            <div className="trial-hud-actions">
              <button
                type="button"
                className="trial-hud-btn trial-hud-btn--primary"
                onClick={onAdvance}
                disabled={isThinking}
              >
                <ChevronRight size={16} />
                {isThinking ? HUD_STRINGS.advance.waiting : HUD_STRINGS.advance.button}
              </button>
            </div>
          )}
        </div>
      </div>

      {transcript.length > 0 && (
        <div className="trial-hud-transcript-hint">{HUD_STRINGS.transcript.hint(transcript.length)}</div>
      )}
    </div>
  )
}
