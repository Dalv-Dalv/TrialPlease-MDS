import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  LawyerContext,
  type LawyerContextValue,
  type LawyerResponse,
  type LawyerSideState,
  type ObjectionDecision,
} from './lawyerContext'
import type { Side, TrialAction } from '../flow-store/flowStore'

const DEFAULT_PERSONAS: Record<Side, LawyerSideState['persona']> = {
  prosecution: { name: 'Prosecutor Halloran', style: 'precise, relentless' },
  defense: { name: 'Counsel Voss', style: 'measured, sympathetic' },
}

const sideKey = (side: Side, evidenceName: string) => `${side}::${evidenceName}`

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function LawyerProvider({ children }: { children: ReactNode }) {
  const [defense, setDefense] = useState<LawyerSideState>({
    persona: DEFAULT_PERSONAS.defense,
    isThinking: false,
    lastUtterance: null,
  })
  const [prosecution, setProsecution] = useState<LawyerSideState>({
    persona: DEFAULT_PERSONAS.prosecution,
    isThinking: false,
    lastUtterance: null,
  })

  const evidenceTurnsRef = useRef<Map<string, number>>(new Map())

  const update = useCallback(
    (side: Side, patch: Partial<LawyerSideState>) => {
      if (side === 'defense') setDefense((s) => ({ ...s, ...patch }))
      else setProsecution((s) => ({ ...s, ...patch }))
    },
    [],
  )

  // TODO: replace with backend call to AI service
  const requestOpeningStatement = useCallback(
    async (side: Side): Promise<string> => {
      update(side, { isThinking: true })
      await delay(600)
      const text =
        side === 'prosecution'
          ? 'Your honor, the prosecution will demonstrate beyond reasonable doubt that the defendant is guilty of the charges presented.'
          : 'Your honor, the defense will show that the evidence is circumstantial at best, and that my client is innocent.'
      update(side, { isThinking: false, lastUtterance: text })
      return text
    },
    [update],
  )

  // TODO: replace with backend call to AI service
  const requestClosingStatement = useCallback(
    async (side: Side): Promise<string> => {
      update(side, { isThinking: true })
      await delay(600)
      const text =
        side === 'prosecution'
          ? 'The evidence speaks for itself. We urge the court to deliver a verdict of guilty.'
          : 'The prosecution has failed to meet its burden. We ask the court to find for the defense.'
      update(side, { isThinking: false, lastUtterance: text })
      return text
    },
    [update],
  )

  // TODO: replace with backend call to AI service
  const requestEvidenceArgument = useCallback(
    async (side: Side, evidenceName: string): Promise<LawyerResponse> => {
      update(side, { isThinking: true })
      await delay(500)

      const key = sideKey(side, evidenceName)
      const turns = evidenceTurnsRef.current.get(key) ?? 0
      evidenceTurnsRef.current.set(key, turns + 1)

      if (turns >= 1) {
        update(side, { isThinking: false })
        return { kind: 'pass_evidence' }
      }

      const text =
        side === 'prosecution'
          ? `Note that "${evidenceName}" directly implicates the defendant — its provenance is unmistakable.`
          : `"${evidenceName}" is circumstantial. There is no chain of custody linking it to my client.`
      update(side, { isThinking: false, lastUtterance: text })
      return { kind: 'evidence_argument', text }
    },
    [update],
  )

  // TODO: replace with backend call to AI service
  const respondToRuling = useCallback(
    async (side: Side, ruling: 'sustained' | 'overruled'): Promise<string | null> => {
      if (ruling === 'overruled') return null
      update(side, { isThinking: true })
      await delay(400)
      const text = 'I withdraw the statement, your honor.'
      update(side, { isThinking: false, lastUtterance: text })
      return text
    },
    [update],
  )

  // TODO: replace with backend call to AI service
  const evaluateObjection = useCallback(
    async (_side: Side, _opponentAction: TrialAction): Promise<ObjectionDecision> => {
      return { objects: false }
    },
    [],
  )

  const reset = useCallback(() => {
    evidenceTurnsRef.current.clear()
    setDefense({ persona: DEFAULT_PERSONAS.defense, isThinking: false, lastUtterance: null })
    setProsecution({ persona: DEFAULT_PERSONAS.prosecution, isThinking: false, lastUtterance: null })
  }, [])

  const value = useMemo<LawyerContextValue>(
    () => ({
      defense,
      prosecution,
      requestOpeningStatement,
      requestClosingStatement,
      requestEvidenceArgument,
      respondToRuling,
      evaluateObjection,
      reset,
    }),
    [
      defense,
      prosecution,
      requestOpeningStatement,
      requestClosingStatement,
      requestEvidenceArgument,
      respondToRuling,
      evaluateObjection,
      reset,
    ],
  )

  return <LawyerContext.Provider value={value}>{children}</LawyerContext.Provider>
}
