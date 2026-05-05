import { Gavel, ShieldCheck, ShieldX, Play } from 'lucide-react'
import { useFlow, type Side } from '../../../../store/flow-store/flowStore'
import { useLawyers } from '../../../../store/lawyer-store/lawyerContext'
import { useCaseGenerator } from '../../../../store/case-generator-store/caseGeneratorContext'
import './TrialHUD.css'

function phaseLabel(
  phase: ReturnType<typeof useFlow.getState>['phase'],
  evidenceIndex: number | null,
  evidenceCount: number,
  evidenceName: string | undefined,
): string {
  switch (phase) {
    case 'pre_trial':
      return 'Court is in session — awaiting commencement'
    case 'opening_prosecution':
      return 'Opening Statement — Prosecution'
    case 'opening_defense':
      return 'Opening Statement — Defense'
    case 'evidence_debate':
      return `Evidence ${(evidenceIndex ?? 0) + 1} of ${evidenceCount} — "${evidenceName ?? ''}"`
    case 'closing_prosecution':
      return 'Closing Argument — Prosecution'
    case 'closing_defense':
      return 'Closing Argument — Defense'
    case 'verdict':
      return 'Deliver your verdict'
    case 'concluded':
      return 'Court adjourned'
  }
}

export function TrialHUD() {
  const phase = useFlow((s) => s.phase)
  const activeSpeaker = useFlow((s) => s.activeSpeaker)
  const currentEvidenceIndex = useFlow((s) => s.currentEvidenceIndex)
  const pendingObjection = useFlow((s) => s.pendingObjection)
  const awaitingUser = useFlow((s) => s.awaitingUser)
  const transcript = useFlow((s) => s.transcript)

  const { caseInfo } = useCaseGenerator()
  const lawyer = useLawyers()

  const evidenceCount = caseInfo?.evidence_items.length ?? 0
  const currentEvidenceName =
    currentEvidenceIndex != null ? caseInfo?.evidence_items[currentEvidenceIndex]?.name : undefined

  const speakerSide: Side | null =
    activeSpeaker === 'defense' || activeSpeaker === 'prosecution' ? activeSpeaker : null
  const speakerState = speakerSide ? lawyer[speakerSide] : null
  const speakerName =
    activeSpeaker === 'judge'
      ? 'The Court (you)'
      : speakerState?.persona.name ?? null

  const speechText = speakerState?.isThinking
    ? '…'
    : speakerState?.lastUtterance ?? null

  const onStart = () => useFlow.getState().startTrial()
  const onSustain = () => useFlow.getState().ruleOnObjection('sustained')
  const onOverrule = () => useFlow.getState().ruleOnObjection('overruled')
  const onVerdict = (choice: string) => useFlow.getState().deliverVerdict(choice)

  const showStart = phase === 'pre_trial' && caseInfo != null
  const showRuling = awaitingUser === 'objection_ruling' && pendingObjection != null
  const showVerdict = awaitingUser === 'verdict' && caseInfo != null

  return (
    <div className="trial-hud" aria-live="polite">
      <div className="trial-hud-phase">{phaseLabel(phase, currentEvidenceIndex, evidenceCount, currentEvidenceName)}</div>

      <div className="trial-hud-card">
        {speakerName && (
          <div className="trial-hud-speaker">
            <span className={`trial-hud-speaker-tag trial-hud-speaker-tag--${speakerSide ?? 'judge'}`}>
              {speakerSide === 'prosecution'
                ? 'Prosecution'
                : speakerSide === 'defense'
                  ? 'Defense'
                  : 'Judge'}
            </span>
            <span className="trial-hud-speaker-name">{speakerName}</span>
          </div>
        )}

        <p className={`trial-hud-speech ${speakerState?.isThinking ? 'trial-hud-speech--thinking' : ''}`}>
          {speechText ?? (phase === 'pre_trial' ? 'Open the case file and begin when ready.' : ' ')}
        </p>

        {showRuling && (
          <div className="trial-hud-ruling">
            <div className="trial-hud-ruling-label">
              <Gavel size={14} />
              <span>
                Objection by <strong>{pendingObjection.side === 'prosecution' ? 'Prosecution' : 'Defense'}</strong> —{' '}
                <em>{pendingObjection.reason}</em>
              </span>
            </div>
            <div className="trial-hud-actions">
              <button type="button" className="trial-hud-btn trial-hud-btn--sustain" onClick={onSustain}>
                <ShieldCheck size={16} />
                Sustain
              </button>
              <button type="button" className="trial-hud-btn trial-hud-btn--overrule" onClick={onOverrule}>
                <ShieldX size={16} />
                Overrule
              </button>
            </div>
          </div>
        )}

        {showVerdict && (
          <div className="trial-hud-verdict">
            <div className="trial-hud-verdict-prompt">Select the verdict:</div>
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
              Begin Trial
            </button>
          </div>
        )}
      </div>

      {transcript.length > 0 && (
        <div className="trial-hud-transcript-hint">{transcript.length} action{transcript.length === 1 ? '' : 's'} on record</div>
      )}
    </div>
  )
}
