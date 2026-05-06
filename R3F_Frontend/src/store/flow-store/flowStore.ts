import { create } from 'zustand'
import { useLawyers } from '../lawyer-store/lawyerStore'
import type { CaseData } from '../case-generator-store/caseGeneratorContext'
// TODO: replace mock imports with real backend calls once the AI service is ready.
import {
  MOCK_CLOSINGS,
  MOCK_OPENINGS,
  MOCK_RULING_RESPONSES,
  findScriptedObjection,
  nextScriptedArgument,
} from '../../test/flow'

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

  startTrial: (caseInfo: CaseData) => void
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

const opposite = (s: Side): Side => (s === 'prosecution' ? 'defense' : 'prosecution')
const sideKey = (side: Side, evidenceName: string) => `${side}::${evidenceName}`

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

// === Module-scope loop state (intentionally outside FlowState) ==============
// Tracks how many scripted arguments each side has delivered for each evidence.
// Cleared on reset() / startTrial(). Not serializable with FlowState — if save
// & resume is added later, hoist this into FlowState.
const evidenceTurnsMap = new Map<string, number>()
let loopRunning = false
// Snapshot of the case being tried. Captured by startTrial() so the loop
// (which runs outside React) can read evidence_items without going through
// the case-generator React context.
let currentCase: CaseData | null = null

// === Lawyer-response fetchers ===============================================
// These would normally hit the backend. Mocked for now; uncomment the fetch
// blocks once `/api/lawyer/respond/` is live and remove the MOCK_* fallbacks.

async function fetchOpeningStatement(side: Side): Promise<string> {
  // const res = await fetch('http://127.0.0.1:8000/api/lawyer/respond/', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     kind: 'opening_statement',
  //     side,
  //     transcript: useFlow.getState().transcript,
  //     case: useCaseGenerator.getState?.().caseInfo, // (or pass case via arg)
  //   }),
  // })
  // return (await res.json()).text as string
  return MOCK_OPENINGS[side]
}

async function fetchClosingStatement(side: Side): Promise<string> {
  // const res = await fetch('http://127.0.0.1:8000/api/lawyer/respond/', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     kind: 'closing_statement',
  //     side,
  //     transcript: useFlow.getState().transcript,
  //   }),
  // })
  // return (await res.json()).text as string
  return MOCK_CLOSINGS[side]
}

async function fetchEvidenceArgument(side: Side, evidenceName: string): Promise<string | null> {
  // const res = await fetch('http://127.0.0.1:8000/api/lawyer/respond/', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     kind: 'evidence_argument',
  //     side,
  //     evidenceName,
  //     transcript: useFlow.getState().transcript,
  //   }),
  // })
  // const data = await res.json()
  // return data.text ?? null // server returns null/empty when the side wants to pass
  const key = sideKey(side, evidenceName)
  const turns = evidenceTurnsMap.get(key) ?? 0
  const text = nextScriptedArgument(side, evidenceName, turns)
  if (text != null) evidenceTurnsMap.set(key, turns + 1)
  return text
}

async function fetchObjectionDecision(
  side: Side,
  opponentAction: TrialAction,
): Promise<{ objects: false } | { objects: true; reason: ObjectionReason }> {
  // const res = await fetch('http://127.0.0.1:8000/api/lawyer/objection/', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ side, opponentAction }),
  // })
  // return (await res.json()) as { objects: boolean; reason?: ObjectionReason }
  const match = findScriptedObjection(side, opponentAction)
  if (!match) return { objects: false }
  return { objects: true, reason: match.reason }
}

async function fetchRulingResponse(
  side: Side,
  ruling: 'sustained' | 'overruled',
): Promise<string | null> {
  // const res = await fetch('http://127.0.0.1:8000/api/lawyer/respond-to-ruling/', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ side, ruling, transcript: useFlow.getState().transcript }),
  // })
  // const data = await res.json()
  // return data.text ?? null
  return MOCK_RULING_RESPONSES[ruling][side]
}

// === Speech / appendAction helpers =========================================

// How long to leave an utterance on screen before the next speaker takes over.
// Scales with text length: ~45ms per character, clamped to a sensible window.
function readingTimeMs(text: string): number {
  return Math.min(8000, Math.max(2200, text.length * 45))
}

async function speak(side: Side, text: string) {
  useLawyers.getState().setThinking(side, true)
  await delay(500)
  useLawyers.getState().setThinking(side, false)
  useLawyers.getState().setUtterance(side, text)
  await delay(readingTimeMs(text))
}

type SpokenAction = Extract<
  TrialAction,
  { kind: 'opening_statement' | 'closing_statement' | 'evidence_argument' }
>

async function maybeRaiseObjection(againstAction: SpokenAction) {
  const objector = opposite(againstAction.side)
  const decision = await fetchObjectionDecision(objector, againstAction)
  if (!decision.objects) return
  useFlow.getState().raiseObjection(objector, decision.reason, againstAction.id)
  // Auto-decline (overrule) for now — UI for sustain/overrule will be wired later.
  // TODO: when the user-controlled ruling UI is ready, defer to user input here
  //       and call fetchRulingResponse(againstAction.side, 'sustained') on a
  //       sustained ruling to append the speaker's rephrase.
  await delay(2000)
  useFlow.getState().ruleOnObjection('overruled')
  void fetchRulingResponse // keep import live until sustained-ruling path is wired
}

// === The driving loop =======================================================

async function runLoop() {
  if (loopRunning) return
  loopRunning = true
  try {
    while (true) {
      const flow = useFlow.getState()
      if (flow.phase === 'pre_trial' || flow.phase === 'concluded') return
      if (flow.awaitingUser === 'verdict') return
      // awaitingUser === 'objection_ruling' is always inline-resolved by
      // maybeRaiseObjection while auto-decline is in effect.

      await runOneStep()
    }
  } finally {
    loopRunning = false
  }
}

async function runOneStep() {
  const flow = useFlow.getState()

  switch (flow.phase) {
    case 'opening_prosecution':
    case 'opening_defense': {
      const side: Side = flow.phase === 'opening_prosecution' ? 'prosecution' : 'defense'
      const text = await fetchOpeningStatement(side)
      await speak(side, text)
      const action: TrialAction = {
        id: newId(),
        ts: Date.now(),
        kind: 'opening_statement',
        side,
        text,
      }
      useFlow.getState().appendAction(action)
      await maybeRaiseObjection(action)
      useFlow.getState().advancePhase()
      return
    }

    case 'closing_prosecution':
    case 'closing_defense': {
      const side: Side = flow.phase === 'closing_prosecution' ? 'prosecution' : 'defense'
      const text = await fetchClosingStatement(side)
      await speak(side, text)
      const action: TrialAction = {
        id: newId(),
        ts: Date.now(),
        kind: 'closing_statement',
        side,
        text,
      }
      useFlow.getState().appendAction(action)
      await maybeRaiseObjection(action)
      useFlow.getState().advancePhase()
      return
    }

    case 'evidence_debate': {
      const caseInfo = currentCase
      if (!caseInfo) {
        // Should not happen if user followed the flow, but bail safely.
        useFlow.getState().advancePhase()
        return
      }
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

      const text = await fetchEvidenceArgument(speaker, evidence.name)
      if (text == null) {
        useFlow.getState().passEvidence(speaker, evidence.name)
      } else {
        await speak(speaker, text)
        const action: TrialAction = {
          id: newId(),
          ts: Date.now(),
          kind: 'evidence_argument',
          side: speaker,
          evidenceName: evidence.name,
          text,
        }
        useFlow.getState().appendAction(action)
        await maybeRaiseObjection(action)
      }
      useFlow.getState().setActiveSpeaker(opposite(speaker))
      return
    }

    case 'pre_trial':
    case 'verdict':
    case 'concluded':
      return
  }
}

// === Store ==================================================================

export const useFlow = create<FlowState>((set, get) => ({
  ...initialState,

  startTrial: (caseInfo) => {
    currentCase = caseInfo
    evidenceTurnsMap.clear()
    useLawyers.getState().reset()
    set({
      ...initialState,
      phase: 'opening_prosecution',
      activeSpeaker: 'prosecution',
    })
    void runLoop()
  },

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

  reset: () => {
    currentCase = null
    evidenceTurnsMap.clear()
    useLawyers.getState().reset()
    set({ ...initialState })
  },
}))

export const newActionId = newId
