import { create } from 'zustand'

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

type FlowState = {
  phase: Phase
  activeSpeaker: Side | 'judge' | null
  currentEvidenceIndex: number | null
  evidencePassed: { defense: boolean; prosecution: boolean }
  pendingObjection: { actionId: string; side: Side; reason: ObjectionReason } | null
  awaitingUser: AwaitingUser
  transcript: TrialAction[]

  startTrial: () => void
  advancePhase: () => void
  advanceEvidence: () => void
  setActiveSpeaker: (s: Side | 'judge' | null) => void
  appendAction: (a: TrialAction) => void
  passEvidence: (side: Side, evidenceName: string) => void
  raiseObjection: (by: Side, reason: ObjectionReason, targetId: string) => void
  ruleOnObjection: (ruling: 'sustained' | 'overruled') => void
  deliverVerdict: (verdict: string) => void
  reset: () => void
}

const initialState = {
  phase: 'pre_trial' as Phase,
  activeSpeaker: null as Side | 'judge' | null,
  currentEvidenceIndex: null as number | null,
  evidencePassed: { defense: false, prosecution: false },
  pendingObjection: null,
  awaitingUser: null as AwaitingUser,
  transcript: [] as TrialAction[],
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const phaseOrder: Phase[] = [
  'pre_trial',
  'opening_prosecution',
  'opening_defense',
  'evidence_debate',
  'closing_prosecution',
  'closing_defense',
  'verdict',
  'concluded',
]

export const useFlow = create<FlowState>((set, get) => ({
  ...initialState,

  startTrial: () =>
    set({
      ...initialState,
      phase: 'opening_prosecution',
      activeSpeaker: 'prosecution',
    }),

  advancePhase: () => {
    const { phase } = get()
    const idx = phaseOrder.indexOf(phase)
    const next = phaseOrder[idx + 1] ?? 'concluded'

    const patch: Partial<FlowState> = { phase: next }

    if (next === 'opening_defense') patch.activeSpeaker = 'defense'
    else if (next === 'evidence_debate') {
      patch.activeSpeaker = 'prosecution'
      patch.currentEvidenceIndex = 0
      patch.evidencePassed = { defense: false, prosecution: false }
    } else if (next === 'closing_prosecution') {
      patch.activeSpeaker = 'prosecution'
      patch.currentEvidenceIndex = null
      patch.evidencePassed = { defense: false, prosecution: false }
    } else if (next === 'closing_defense') patch.activeSpeaker = 'defense'
    else if (next === 'verdict') {
      patch.activeSpeaker = 'judge'
      patch.awaitingUser = 'verdict'
    } else if (next === 'concluded') patch.activeSpeaker = null

    set(patch)
  },

  advanceEvidence: () =>
    set((s) => ({
      currentEvidenceIndex: (s.currentEvidenceIndex ?? 0) + 1,
      evidencePassed: { defense: false, prosecution: false },
      activeSpeaker: 'prosecution',
    })),

  setActiveSpeaker: (s) => set({ activeSpeaker: s }),

  appendAction: (a) => set((s) => ({ transcript: [...s.transcript, a] })),

  passEvidence: (side, evidenceName) =>
    set((s) => ({
      transcript: [
        ...s.transcript,
        { id: newId(), ts: Date.now(), kind: 'pass_evidence', side, evidenceName },
      ],
      evidencePassed: { ...s.evidencePassed, [side]: true },
    })),

  raiseObjection: (by, reason, targetId) => {
    const action: TrialAction = {
      id: newId(),
      ts: Date.now(),
      kind: 'objection',
      side: by,
      reason,
      targetId,
    }
    set((s) => ({
      transcript: [...s.transcript, action],
      pendingObjection: { actionId: action.id, side: by, reason },
      awaitingUser: 'objection_ruling',
    }))
  },

  ruleOnObjection: (ruling) => {
    const pending = get().pendingObjection
    if (!pending) return
    const action: TrialAction = {
      id: newId(),
      ts: Date.now(),
      kind: 'objection_ruling',
      ruling,
      objectionId: pending.actionId,
    }
    set((s) => ({
      transcript: [...s.transcript, action],
      pendingObjection: null,
      awaitingUser: null,
    }))
  },

  deliverVerdict: (verdict) => {
    const action: TrialAction = {
      id: newId(),
      ts: Date.now(),
      kind: 'verdict',
      verdict,
    }
    set((s) => ({
      transcript: [...s.transcript, action],
      awaitingUser: null,
      phase: 'concluded',
      activeSpeaker: null,
    }))
  },

  reset: () => set({ ...initialState }),
}))

export const newActionId = newId
