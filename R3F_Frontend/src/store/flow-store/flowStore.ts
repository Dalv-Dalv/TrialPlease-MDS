import { create } from 'zustand'
import { useLawyers } from '../lawyer-store/lawyerStore'
import type { CaseData } from '../case-generator-store/caseGeneratorContext'
import type {
  AwaitingUser,
  DebriefResult,
  FlowState,
  LawyerActionResponse,
  ObjectionReason,
  Phase,
  Side,
  SpokenAction,
  TrialAction,
} from './types'
// TODO: replace mock imports with real backend calls once the AI service is ready.
import { mockLawyerAction, resetMockLawyerAction } from '../../test/flow'

const initialState = {
  phase: 'pre_trial' as Phase,
  activeSpeaker: null as Side | 'judge' | null,
  currentEvidenceIndex: null as number | null,
  evidencePassed: { defense: false, prosecution: false },
  pendingObjection: null,
  awaitingUser: null as AwaitingUser,
  transcript: [] as TrialAction[],
  caseId: null as number | null,
  confidence: { defense: 0.5, prosecution: 0.5 },
  debrief: null as DebriefResult | null,
  recentSpeech: [] as { id: string; side: Side; text: string }[],
  prefetch: null,
}

const RECENT_SPEECH_MAX = 8

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


// Snapshot of the case being tried. The flow lives outside React, so we
// capture it on startTrial() instead of going through the case-generator
// context to read evidence_items by index.
let currentCase: CaseData | null = null

// Re-entrancy guard for advanceTurn(): repeated calls (e.g. spamming the
// Continue button or holding Enter) collapse into a single in-flight turn.
let advanceInProgress = false

// === API fetchers ============================================================
// Hits the Django backend documented in BACKEND_CHANGES.md. URLs are relative
// — Vite's dev server proxies `/api/*` to the backend (see vite.config.ts).
// Falls back to the mocks in `src/test/flow.ts` when the network call fails so
// dev continues to work without a live backend.

/**
 * Backend returns `{ action, reason, dialogue, confidence_level? }`.
 * Map to the internal `LawyerActionResponse` shape (statement uses `text`).
 */
function normalizeLawyerAction(raw: {
  action?: string
  reason?: string | null
  dialogue?: string | null
  text?: string | null
  confidence_level?: number
}): LawyerActionResponse {
  const confidence = raw.confidence_level ?? 0.5
  if (raw.action === 'objection') {
    return {
      action: 'objection',
      reason: (raw.reason ?? 'argumentative') as ObjectionReason,
      confidence_level: confidence,
    }
  }
  return {
    action: 'statement',
    text: raw.dialogue ?? raw.text ?? '',
    confidence_level: confidence,
  }
}

async function fetchLawyerAction(
  caseId: number,
  side: Side,
  confidence: number,
  phase: Phase,
  currentEvidenceName: string | null,
  transcript: TrialAction[],
): Promise<LawyerActionResponse> {
  try {
    if (!caseId) throw new Error('missing caseId')
    const res = await fetch(`/api/cases/${caseId}/lawyer_action/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lawyer_type: side === 'prosecution' ? 'prosecutor' : 'defense',
        confidence_level: confidence,
        transcript,
        phase,
        evidence_name: currentEvidenceName,
      }),
    })
    if (!res.ok) throw new Error(`lawyer_action ${res.status}`)
    return normalizeLawyerAction(await res.json())
  } catch (err) {
    console.warn('[flow] lawyer_action API failed, falling back to mock:', err)
    return mockLawyerAction(side, phase, currentEvidenceName, transcript, confidence)
  }
}

async function fetchDebrief(caseId: number, verdict: string): Promise<DebriefResult> {
  try {
    if (!caseId) throw new Error('missing caseId')
    const res = await fetch(`/api/cases/${caseId}/debrief/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdict }),
    })
    if (!res.ok) throw new Error(`debrief ${res.status}`)
    return (await res.json()) as DebriefResult
  } catch (err) {
    console.warn('[flow] debrief API failed, falling back to stub:', err)
    const correct = verdict === currentCase?.correct_verdict
    return {
      correct,
      absolute_truth:
        currentCase != null
          ? `(stub) the absolute truth would be returned by the backend; ${correct ? 'your verdict matches' : 'your verdict does not match'} the recorded correct verdict (${currentCase.correct_verdict}).`
          : '',
    }
  }
}

// === Speech / appendAction helpers ==========================================

/** Set the lawyer side into "thinking" — clears prior utterance so the HUD
 *  shows "..." immediately instead of the previous speech. */
function beginThinking(side: Side) {
  useLawyers.getState().setUtterance(side, null)
  useLawyers.getState().setThinking(side, true)
}

/** Commit a freshly-spoken utterance: clear thinking, store text, push to
 *  the recent-speech ring buffer for the HUD. */
function commitSpeech(side: Side, text: string) {
  const id = newId()
  useLawyers.getState().setThinking(side, false)
  useLawyers.getState().setUtterance(side, text)
  useFlow.setState((s) => ({
    recentSpeech: [...s.recentSpeech, { id, side, text }].slice(-RECENT_SPEECH_MAX),
  }))
}

/** Clear the thinking flag without committing speech (used on objections). */
function endThinking(side: Side) {
  useLawyers.getState().setThinking(side, false)
}

const isSpoken = (a: TrialAction): a is SpokenAction =>
  a.kind === 'opening_statement' ||
  a.kind === 'closing_statement' ||
  a.kind === 'evidence_argument'

function lastSpokenBy(transcript: TrialAction[], side: Side): SpokenAction | null {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const a = transcript[i]
    if (isSpoken(a) && a.side === side) return a
  }
  return null
}

function computeNextState(flow: FlowState, totalEvidenceItems: number): Partial<FlowState> {
  const patch: Partial<FlowState> = {}
  const lastAction = flow.transcript[flow.transcript.length - 1]
  if (!lastAction) return patch

  if (
    (flow.phase === 'opening_prosecution' && lastAction.kind === 'opening_statement' && lastAction.side === 'prosecution') ||
    (flow.phase === 'opening_defense' && lastAction.kind === 'opening_statement' && lastAction.side === 'defense') ||
    (flow.phase === 'closing_prosecution' && lastAction.kind === 'closing_statement' && lastAction.side === 'prosecution') ||
    (flow.phase === 'closing_defense' && lastAction.kind === 'closing_statement' && lastAction.side === 'defense')
  ) {
    const idx = phaseOrder.indexOf(flow.phase)
    const next = phaseOrder[idx + 1] ?? 'concluded'
    patch.phase = next

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

  } else if (flow.phase === 'evidence_debate') {
    if (lastAction.kind === 'objection_ruling') {
      const objection = flow.transcript.find((a) => a.id === lastAction.objectionId)
      if (objection && objection.kind === 'objection') {
        patch.activeSpeaker = opposite(objection.side)
      }
    } else if (lastAction.kind === 'evidence_argument' || lastAction.kind === 'pass_evidence') {
      if (flow.evidencePassed.defense && flow.evidencePassed.prosecution) {
        const idx = flow.currentEvidenceIndex ?? 0
        if (idx + 1 < totalEvidenceItems) {
          patch.currentEvidenceIndex = idx + 1
          patch.evidencePassed = { defense: false, prosecution: false }
          patch.activeSpeaker = 'prosecution'
        } else {
          patch.phase = 'closing_prosecution'
          patch.activeSpeaker = 'prosecution'
          patch.currentEvidenceIndex = null
          patch.evidencePassed = { defense: false, prosecution: false }
        }
      } else if (lastAction.side === flow.activeSpeaker) {
        patch.activeSpeaker = opposite(flow.activeSpeaker)
      }
    }
  }

  return patch
}

// === Store ==================================================================

export const useFlow = create<FlowState>((set, get) => ({
  ...initialState,

  startTrial: (caseInfo) => {
    currentCase = caseInfo
    advanceInProgress = false
    resetMockLawyerAction()
    useLawyers.getState().reset()
    set({
      ...initialState,
      caseId: caseInfo.id,
      phase: 'opening_prosecution',
      activeSpeaker: 'prosecution',
    })
    setTimeout(() => get().advanceTurn(), 0)
  },

  advanceTurn: async () => {
    if (advanceInProgress) return
    const flow = get()
    if (flow.awaitingUser) return
    if (
      flow.phase === 'pre_trial' ||
      flow.phase === 'concluded' ||
      flow.phase === 'verdict'
    ) {
      return
    }

    // --- 1. STATE TRANSITION ---
    // The previous turn has finished and the user clicked Continue. 
    // Advance the state based on the LAST action in the transcript BEFORE fetching the next action.
    const lastAction = flow.transcript[flow.transcript.length - 1]

    if (lastAction) {
      const patch = computeNextState(flow, currentCase?.evidence_items.length ?? 0)
      if (Object.keys(patch).length > 0) {
        set(patch)
      }
    }

    // Now, get the FRESH state after potential advancement
    const currentFlow = get()
    const speaker = currentFlow.activeSpeaker

    if (currentFlow.phase === 'verdict' || currentFlow.phase === 'concluded') {
      return
    }

    if (speaker !== 'defense' && speaker !== 'prosecution') return

    advanceInProgress = true
    // Show "..." immediately so the user gets feedback while the API is in flight.
    beginThinking(speaker)
    try {
      const evidenceName =
        currentFlow.phase === 'evidence_debate' && currentFlow.currentEvidenceIndex != null
          ? (currentCase?.evidence_items[currentFlow.currentEvidenceIndex]?.name ?? null)
          : null

      let response: LawyerActionResponse
      const pf = currentFlow.prefetch
      if (
        pf &&
        pf.phase === currentFlow.phase &&
        pf.speaker === speaker &&
        pf.evidenceIndex === currentFlow.currentEvidenceIndex &&
        pf.transcriptLength === currentFlow.transcript.length
      ) {
        console.debug('[flow] using prefetched lawyer_action response')
        response = await pf.promise
        set({ prefetch: null })
      } else {
        response = await fetchLawyerAction(
          currentFlow.caseId ?? 0,
          speaker,
          currentFlow.confidence[speaker],
          currentFlow.phase,
          evidenceName,
          currentFlow.transcript,
        )
      }
      console.debug('[flow] lawyer_action response', { phase: currentFlow.phase, speaker, response })

      if (response.action === 'objection') {
        endThinking(speaker)
        const target = lastSpokenBy(currentFlow.transcript, opposite(speaker))
        if (!target) return
        get().raiseObjection(speaker, response.reason, target.id)
        return
      }

      const text = response.text ?? ''
      if (text) commitSpeech(speaker, text)
      else endThinking(speaker)

      // ── Append action (Phase/Speaker transition deferred to next turn) ──
      if (currentFlow.phase === 'opening_prosecution' || currentFlow.phase === 'opening_defense') {
        get().appendAction({
          id: newId(),
          ts: Date.now(),
          kind: 'opening_statement',
          side: speaker,
          text,
        })
      } else if (currentFlow.phase === 'closing_prosecution' || currentFlow.phase === 'closing_defense') {
        get().appendAction({
          id: newId(),
          ts: Date.now(),
          kind: 'closing_statement',
          side: speaker,
          text,
        })
      } else if (currentFlow.phase === 'evidence_debate' && evidenceName) {
        if (!text) {
          get().passEvidence(speaker, evidenceName)
        } else {
          get().appendAction({
            id: newId(),
            ts: Date.now(),
            kind: 'evidence_argument',
            side: speaker,
            evidenceName,
            text,
          })
          // New material on the table — opponent gets a fresh chance to rebut.
          set((s) => ({
            evidencePassed: { ...s.evidencePassed, [opposite(speaker)]: false },
          }))
        }
      }
    } finally {
      advanceInProgress = false
      setTimeout(() => get().prefetchNextTurn(), 0)
    }
  },

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

  approveObjection: () => {
    const pending = get().pendingObjection
    if (!pending) return
    const ruling: TrialAction = {
      id: newId(),
      ts: Date.now(),
      kind: 'objection_ruling',
      ruling: 'sustained',
      objectionId: pending.actionId,
    }
    set((s) => ({
      transcript: [...s.transcript, ruling],
      pendingObjection: null,
      awaitingUser: null,
    }))
  },

  opposeObjection: () => {
    const pending = get().pendingObjection
    if (!pending) return
    const ruling: TrialAction = {
      id: newId(),
      ts: Date.now(),
      kind: 'objection_ruling',
      ruling: 'overruled',
      objectionId: pending.actionId,
    }
    set((s) => ({
      transcript: [...s.transcript, ruling],
      pendingObjection: null,
      awaitingUser: null,
    }))
  },

  deliverVerdict: async (verdict) => {
    const action: TrialAction = {
      id: newId(),
      ts: Date.now(),
      kind: 'verdict',
      verdict,
    }
    const caseId = get().caseId ?? 0
    set((s) => ({
      transcript: [...s.transcript, action],
      awaitingUser: null,
      phase: 'concluded',
      activeSpeaker: null,
    }))
    const result = await fetchDebrief(caseId, verdict)
    set({ debrief: result })
    return result
  },

  reset: () => {
    currentCase = null
    advanceInProgress = false
    resetMockLawyerAction()
    useLawyers.getState().reset()
    set({ ...initialState })
  },

  // === Internal mutations =====================================================

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

  prefetchNextTurn: () => {
    const flow = get()
    if (flow.phase === 'verdict' || flow.phase === 'concluded' || flow.awaitingUser) return

    const totalEvidence = currentCase?.evidence_items.length ?? 0
    const patch = computeNextState(flow, totalEvidence)

    const nextPhase = patch.phase ?? flow.phase
    const nextSpeaker = patch.activeSpeaker ?? flow.activeSpeaker
    const nextEvidenceIndex = patch.currentEvidenceIndex !== undefined ? patch.currentEvidenceIndex : flow.currentEvidenceIndex

    if (nextPhase === 'verdict' || nextPhase === 'concluded') return
    if (nextSpeaker !== 'defense' && nextSpeaker !== 'prosecution') return

    const evidenceName =
      nextPhase === 'evidence_debate' && nextEvidenceIndex != null
        ? (currentCase?.evidence_items[nextEvidenceIndex]?.name ?? null)
        : null

    const promise = fetchLawyerAction(
      flow.caseId ?? 0,
      nextSpeaker,
      flow.confidence[nextSpeaker],
      nextPhase,
      evidenceName,
      flow.transcript // transcript already has the latest action appended
    )

    set({
      prefetch: {
        phase: nextPhase,
        speaker: nextSpeaker,
        evidenceIndex: nextEvidenceIndex,
        promise,
        transcriptLength: flow.transcript.length,
      },
    })
  },
}))

export const newActionId = newId
