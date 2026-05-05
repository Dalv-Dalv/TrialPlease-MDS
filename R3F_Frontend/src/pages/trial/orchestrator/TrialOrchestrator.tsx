import { useEffect, useRef } from 'react'
import { newActionId, useFlow } from '../../../store/flow-store/flowStore'
import { useLawyers } from '../../../store/lawyer-store/lawyerContext'
import { useCaseGenerator } from '../../../store/case-generator-store/caseGeneratorContext'

export function TrialOrchestrator() {
  const phase = useFlow((s) => s.phase)
  const activeSpeaker = useFlow((s) => s.activeSpeaker)
  const currentEvidenceIndex = useFlow((s) => s.currentEvidenceIndex)
  const defensePassed = useFlow((s) => s.evidencePassed.defense)
  const prosecutionPassed = useFlow((s) => s.evidencePassed.prosecution)
  const awaitingUser = useFlow((s) => s.awaitingUser)
  const transcriptLength = useFlow((s) => s.transcript.length)

  const { caseInfo } = useCaseGenerator()
  const lawyer = useLawyers()

  const busyRef = useRef(false)

  useEffect(() => {
    if (awaitingUser) return
    if (busyRef.current) return
    if (!caseInfo && phase !== 'pre_trial' && phase !== 'concluded') return

    const flow = useFlow.getState()

    busyRef.current = true
    runStep().finally(() => {
      busyRef.current = false
    })

    async function runStep() {
      switch (flow.phase) {
        case 'opening_prosecution':
        case 'opening_defense': {
          const side = flow.phase === 'opening_prosecution' ? 'prosecution' : 'defense'
          const text = await lawyer.requestOpeningStatement(side)
          useFlow.getState().appendAction({
            id: newActionId(),
            ts: Date.now(),
            kind: 'opening_statement',
            side,
            text,
          })
          useFlow.getState().advancePhase()
          return
        }

        case 'closing_prosecution':
        case 'closing_defense': {
          const side = flow.phase === 'closing_prosecution' ? 'prosecution' : 'defense'
          const text = await lawyer.requestClosingStatement(side)
          useFlow.getState().appendAction({
            id: newActionId(),
            ts: Date.now(),
            kind: 'closing_statement',
            side,
            text,
          })
          useFlow.getState().advancePhase()
          return
        }

        case 'evidence_debate': {
          if (!caseInfo) return
          const idx = flow.currentEvidenceIndex ?? 0
          const evidence = caseInfo.evidence_items[idx]
          if (!evidence) {
            useFlow.getState().advancePhase()
            return
          }

          if (flow.evidencePassed.defense && flow.evidencePassed.prosecution) {
            if (idx + 1 < caseInfo.evidence_items.length) {
              useFlow.getState().advanceEvidence()
            } else {
              useFlow.getState().advancePhase()
            }
            return
          }

          const speaker = flow.activeSpeaker
          if (speaker !== 'defense' && speaker !== 'prosecution') return

          const response = await lawyer.requestEvidenceArgument(speaker, evidence.name)
          if (response.kind === 'evidence_argument') {
            useFlow.getState().appendAction({
              id: newActionId(),
              ts: Date.now(),
              kind: 'evidence_argument',
              side: speaker,
              evidenceName: evidence.name,
              text: response.text,
            })
          } else {
            useFlow.getState().passEvidence(speaker, evidence.name)
          }
          useFlow.getState().setActiveSpeaker(speaker === 'prosecution' ? 'defense' : 'prosecution')
          return
        }

        case 'pre_trial':
        case 'verdict':
        case 'concluded':
          return
      }
    }
  }, [
    phase,
    activeSpeaker,
    currentEvidenceIndex,
    defensePassed,
    prosecutionPassed,
    awaitingUser,
    transcriptLength,
    caseInfo,
    lawyer,
  ])

  return null
}
