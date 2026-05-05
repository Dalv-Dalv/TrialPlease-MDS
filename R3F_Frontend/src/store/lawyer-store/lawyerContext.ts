import { createContext, useContext } from 'react'
import type { ObjectionReason, Side, TrialAction } from '../flow-store/flowStore'

export type LawyerSideState = {
  persona: { name: string; style: string }
  isThinking: boolean
  lastUtterance: string | null
}

export type LawyerResponse =
  | { kind: 'evidence_argument'; text: string }
  | { kind: 'pass_evidence' }

export type ObjectionDecision =
  | { objects: false }
  | { objects: true; reason: ObjectionReason }

export type LawyerContextValue = {
  defense: LawyerSideState
  prosecution: LawyerSideState

  requestOpeningStatement: (side: Side) => Promise<string>
  requestClosingStatement: (side: Side) => Promise<string>
  requestEvidenceArgument: (side: Side, evidenceName: string) => Promise<LawyerResponse>
  respondToRuling: (side: Side, ruling: 'sustained' | 'overruled') => Promise<string | null>
  evaluateObjection: (side: Side, opponentAction: TrialAction) => Promise<ObjectionDecision>

  reset: () => void
}

export const LawyerContext = createContext<LawyerContextValue | null>(null)

export function useLawyers() {
  const ctx = useContext(LawyerContext)
  if (!ctx) throw new Error('useLawyers must be used within LawyerProvider')
  return ctx
}
