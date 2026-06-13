import type { CaseData } from '../case-generator-store/caseGeneratorContext'

export type Side = 'defense' | 'prosecution'

export type ObjectionReason =
  | 'leading'
  | 'speculation'
  | 'hearsay'
  | 'relevance'
  | 'badgering'
  | 'argumentative'

export type TrialAction =
  | { id: string; ts: number; kind: 'opening_statement'; side: Side; text: string }
  | { id: string; ts: number; kind: 'closing_statement'; side: Side; text: string }
  | { id: string; ts: number; kind: 'evidence_argument'; side: Side; evidenceName: string; text: string }
  | { id: string; ts: number; kind: 'pass_evidence'; side: Side; evidenceName: string }
  | { id: string; ts: number; kind: 'objection'; side: Side; reason: ObjectionReason; targetId: string }
  | { id: string; ts: number; kind: 'objection_ruling'; ruling: 'sustained' | 'overruled'; objectionId: string }
  | { id: string; ts: number; kind: 'verdict'; verdict: string }

/** Subset of TrialAction representing actions a side actively speaks. */
export type SpokenAction = Extract<
  TrialAction,
  { kind: 'opening_statement' | 'closing_statement' | 'evidence_argument' }
>

export type Phase =
  | 'pre_trial'
  | 'opening_prosecution'
  | 'opening_defense'
  | 'evidence_debate'
  | 'closing_prosecution'
  | 'closing_defense'
  | 'verdict'
  | 'concluded'

export type AwaitingUser = 'objection_ruling' | 'verdict' | null

/**
 * Response shape from `POST /api/cases/<id>/lawyer_action/`.
 * The AI decides per call whether to make a statement or raise an objection.
 * An empty `text` on a statement is interpreted as "this side passes" during
 * evidence_debate.
 */
export type LawyerActionResponse =
  | { action: 'statement'; text: string; confidence_level: number }
  | { action: 'objection'; reason: ObjectionReason; confidence_level: number }

/** Response shape from `POST /api/cases/<id>/debrief/`. */
export type DebriefResult = {
  correct: boolean
  absolute_truth: string
  score?: number
}

/** Compact entry kept in flow.recentSpeech for the HUD to render history. */
export type SpeechEntry = {
  id: string
  side: Side
  text: string
}

export type PrefetchState = {
  phase: Phase
  speaker: Side
  evidenceIndex: number | null
  promise: Promise<LawyerActionResponse>
}

export type FlowState = {
  // === phase machine ===
  phase: Phase
  activeSpeaker: Side | 'judge' | null
  currentEvidenceIndex: number | null
  evidencePassed: { defense: boolean; prosecution: boolean }
  pendingObjection: { actionId: string; side: Side; reason: ObjectionReason } | null
  awaitingUser: AwaitingUser
  transcript: TrialAction[]

  // === trial-scoped context ===
  caseId: number | null
  confidence: { defense: number; prosecution: number }
  debrief: DebriefResult | null

  /** Last 8 spoken responses (statements only), newest at the end. */
  recentSpeech: SpeechEntry[]

  // === prefetching ===
  prefetch: PrefetchState | null

  /** Monotonic counter incremented every time the trial begins. The Gavel
   *  watches this and triggers its strike animation when it changes. */
  gavelStrikeTick: number

  // === user-callable trial control ===
  /** Run one turn for the current speaker. Statement or objection auto-routed. */
  advanceTurn: () => Promise<void>
  /** Record a lawyer's objection and pause the trial pending user ruling. */
  raiseObjection: (by: Side, reason: ObjectionReason, targetId: string) => void
  /** User sustains the pending objection. */
  approveObjection: () => void
  /** User overrules the pending objection. */
  opposeObjection: () => void

  // === entry / exit ===
  startTrial: (caseInfo: CaseData) => void
  deliverVerdict: (verdict: string) => Promise<DebriefResult>
  reset: () => void

  // === internal mutations (kept on the public type so tests / debug can poke) ===
  advancePhase: () => void
  advanceEvidence: () => void
  setActiveSpeaker: (s: Side | 'judge' | null) => void
  appendAction: (a: TrialAction) => void
  passEvidence: (side: Side, evidenceName: string) => void
  prefetchNextTurn: () => void
}
