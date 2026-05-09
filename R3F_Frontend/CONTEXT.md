# Trial system — state architecture

This document is the source of truth for how runtime state is split across stores in the trial gameplay loop. Read it before adding state, refactoring a store, or wiring a new participant.

## Roles in a trial

- **Prosecution (AI)** — argues for guilt, opens first.
- **Defense (AI)** — argues for innocence, rebuts.
- **Judge (User)** — does *not* argue. Three responsibilities:
  1. **Click "Continue"** to advance turn-by-turn through the trial. Each click triggers one `advanceTurn()` call.
  2. **Sustain or overrule** objections raised by the AI lawyers (`approveObjection` / `opposeObjection`).
  3. **Deliver the final verdict** at the end — backend `/debrief/` returns the absolute truth.
- **No witnesses** in v1. Witness data on `CaseData` is ignored for now.

## Three-store split

| Store              | Persistence | Role                                                                                       |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------ |
| `case-generator`   | Context     | Source of truth for the generated case. Loaded once per trial.                             |
| `lawyer`           | Zustand     | Passive UI state per side: `persona`, `isThinking`, `lastUtterance`. Drives lawyer animations and speech-bubble rendering. **No AI logic.** |
| `flow`             | Zustand     | Turn machine + transcript + **user-paced trial control**. Exposes four UI-callable actions (`advanceTurn`, `raiseObjection`, `approveObjection`, `opposeObjection`) plus `startTrial` / `deliverVerdict` / `reset`. Calls lawyer setters and the (mocked) AI endpoints. |

### Dependency direction (one-way)

```
case-generator  ←  flow  →  lawyer (UI state setters)
                    │
                    └─→  test/flow (MOCK_*) / future backend API
```

- `case-generator` has zero runtime dependencies on the other stores. The HUD passes `caseInfo` into `flow.startTrial(caseInfo)` so the loop has a synchronous handle to evidence_items without going through the case-generator React context.
- `flow` imports `useLawyers` and calls `setThinking` / `setUtterance` to animate the active speaker as it walks the trial.
- `lawyer` imports nothing from `flow` at runtime (only `Side` type). It exposes setters; it does not initiate work.

### Why Zustand for flow and lawyer

`flow.activeSpeaker` and per-side `isThinking` flip frequently and only specific components care (speech bubble, lawyer mesh animations). Zustand's selector subscriptions keep re-renders local. The flow loop also runs *outside* React, so it needs `getState()` access — Context can't provide that.

`case-generator` is still Context because it changes infrequently (once per fetched case) and is consumed by React-tree components only.

---

## Trial phases

Linear progression. Flow advances through phases via `advancePhase()`:

```
pre_trial
  → opening_prosecution
  → opening_defense
  → evidence_debate            ← multi-evidence loop, see below
  → closing_prosecution
  → closing_defense
  → verdict                    ← awaits user
  → concluded
```

### Evidence debate sub-loop

Walks through `caseInfo.evidence_items` one item at a time, indexed by `currentEvidenceIndex`.

For each evidence item, AIs alternate freely. Each AI turn produces either an **argument** or a **pass** (server returns `null` text → pass). Pass semantics:

- `evidencePassed[side] = true` when that side passes.
- A side speaking (argument) **resets the opponent's pass flag** — new material on the table means your opponent gets another chance to respond.
- When both flags are `true` simultaneously, orchestrator advances `currentEvidenceIndex`.
- Both flags reset to `false` when entering a new evidence item.
- After the last evidence, `phase` advances to `closing_prosecution`.

Prosecution speaks first on each new evidence.

---

## Action types (transcript schema)

The transcript is `TrialAction[]` — append-only. It feeds AI prompts, drives UI rendering, and supports replay/debug.

```ts
type Side = 'defense' | 'prosecution'

type ObjectionReason =
  | 'leading'
  | 'speculation'
  | 'hearsay'
  | 'relevance'
  | 'badgering'
  | 'argumentative'

type TrialAction =
  | { id: string; ts: number; kind: 'opening_statement';  side: Side; text: string }
  | { id: string; ts: number; kind: 'closing_statement';  side: Side; text: string }
  | { id: string; ts: number; kind: 'evidence_argument';  side: Side; evidenceName: string; text: string }
  | { id: string; ts: number; kind: 'pass_evidence';      side: Side; evidenceName: string }
  | { id: string; ts: number; kind: 'objection';          side: Side; reason: ObjectionReason; targetId: string }
  | { id: string; ts: number; kind: 'objection_ruling';   ruling: 'sustained' | 'overruled'; objectionId: string }
  | { id: string; ts: number; kind: 'verdict';            verdict: string }
```

`targetId` on `objection` and `objectionId` on `objection_ruling` reference the `id` of the action being objected to / ruled on.

---

## Flow store (Zustand) — user-paced trial control

The flow store does **not** auto-run. The UI drives the trial by calling `advanceTurn()` once per turn (typically wired to a "Continue" button).

### Public surface

```ts
type FlowState = {
  // phase / turn-machine state
  phase: Phase
  activeSpeaker: Side | 'judge' | null
  currentEvidenceIndex: number | null
  evidencePassed: { defense: boolean; prosecution: boolean }
  pendingObjection: { actionId: string; side: Side; reason: ObjectionReason } | null
  awaitingUser: 'objection_ruling' | 'verdict' | null
  transcript: TrialAction[]

  // trial-scoped context
  caseId: number | null
  confidence: { defense: number; prosecution: number }
  debrief: DebriefResult | null

  // ===== user-callable trial control =====
  advanceTurn(): Promise<void>
  raiseObjection(by: Side, reason: ObjectionReason, targetId: string): void
  approveObjection(): void   // sustained
  opposeObjection(): void    // overruled

  // ===== entry / exit =====
  startTrial(caseInfo: CaseData): void
  deliverVerdict(verdict: string): Promise<DebriefResult>
  reset(): void

  // ===== internal mutations (kept on the public type for tests / debug) =====
  advancePhase(): void
  advanceEvidence(): void
  setActiveSpeaker(s): void
  appendAction(a: TrialAction): void
  passEvidence(side, evidenceName): void
}
```

### `advanceTurn()` — one turn for the current speaker

1. **Bail conditions**: returns immediately if `awaitingUser !== null`, or `phase` is `pre_trial` / `verdict` / `concluded`.
2. **Evidence-debate cleanup**: if both `evidencePassed` flags are true, advances to next evidence (or to `closing_prosecution` if last evidence). Returns.
3. **Calls `fetchLawyerAction(caseId, side, confidence, phase, evidenceName, transcript)`** — one universal endpoint, returns either `{ action: 'statement', text }` or `{ action: 'objection', reason }`.
4. **Branches on the response**:
   - `objection` → finds the most recent `SpokenAction` by the opposite side (via `lastSpokenBy`) and calls `raiseObjection(side, reason, target.id)`. Activates `awaitingUser='objection_ruling'`. Speaker stays put — a sustained or overruled ruling does NOT rotate the speaker; the same side will be asked again on the next `advanceTurn`.
   - `statement` with empty text in `evidence_debate` → `passEvidence(side, evidenceName)` and rotate.
   - `statement` with text → animate (`setThinking` → 500ms delay → `setUtterance`), `appendAction`, then either `advancePhase()` (openings/closings) or rotate `activeSpeaker` and reset opponent's pass flag (evidence_debate).

### `raiseObjection`, `approveObjection`, `opposeObjection`

- `raiseObjection(by, reason, targetId)` — appends an `objection` action; sets `pendingObjection` and `awaitingUser='objection_ruling'`. Public so the UI / tests can also raise objections; in normal flow it's only called from inside `advanceTurn`.
- `approveObjection()` — appends `objection_ruling { ruling: 'sustained' }`, clears `pendingObjection` and `awaitingUser`. **No auto-rephrase** — the trial just continues on the next `advanceTurn` (the AI sees the sustain in the transcript and adapts).
- `opposeObjection()` — same as above with `ruling: 'overruled'`.

### `deliverVerdict(verdict): Promise<DebriefResult>`

1. Appends a `verdict` action.
2. Sets `phase='concluded'`, `awaitingUser=null`, `activeSpeaker=null`.
3. `await fetchDebrief(caseId, verdict)` — hits `/api/cases/<id>/debrief/`, gets `{ correct, absolute_truth, score? }`.
4. Stores the result in `flow.debrief` and returns it from the promise so the UI can render the post-game screen.

### AI fetchers

Two private fetchers live in `flowStore.ts`, each with a commented-out `fetch()` block above the mock fallback:

```ts
async function fetchLawyerAction(caseId, side, confidence, phase, evidenceName, transcript): Promise<LawyerActionResponse>
async function fetchDebrief(caseId, verdict): Promise<DebriefResult>
```

The mocks live in `src/test/flow.ts` (`mockLawyerAction`, plus the existing `MOCK_OPENINGS / MOCK_CLOSINGS / MOCK_EVIDENCE_ARGUMENTS / MOCK_OBJECTION_TRIGGERS` content). The mock decides per call whether to return an objection (when the opponent's most recent statement matches a trigger) or the next scripted line.

### Per-evidence turn tracking

Lives **inside the mock** (`evidenceTurnsMap` in `src/test/flow.ts`), not in flow state. The real backend tracks its own context via the transcript.

### Key invariants

- `awaitingUser !== null` ⇒ `advanceTurn()` is a no-op until cleared.
- `pendingObjection !== null` ⇔ `awaitingUser === 'objection_ruling'`.
- `currentEvidenceIndex !== null` ⇔ `phase === 'evidence_debate'`.
- After `raiseObjection` and a ruling, `activeSpeaker` is unchanged — the objector keeps the floor for the next `advanceTurn` (where they'll typically deliver a statement).

---

## Lawyer store (Zustand) — passive UI state

```ts
type LawyerSideState = {
  persona: { name: string; style: string }
  isThinking: boolean
  lastUtterance: string | null
}

type LawyerStoreState = {
  defense: LawyerSideState
  prosecution: LawyerSideState

  setThinking(side: Side, value: boolean): void
  setUtterance(side: Side, text: string | null): void
  reset(): void
}
```

Components animate / render based on these fields. The flow loop is the only writer; the HUD and 3D lawyer meshes are readers.

Personas come from `MOCK_PERSONAS` in `src/test/flow.ts`.

---

## File layout

```
src/store/
├── auth.tsx                                  ← existing
├── authContext.ts                            ← existing
├── case-generator-store/
│   ├── caseGeneratorStore.tsx                ← provider (still Context)
│   └── caseGeneratorContext.ts               ← types + useCaseGenerator hook
├── lawyer-store/
│   └── lawyerStore.ts                        ← Zustand store, no provider
└── flow-store/
    ├── flowStore.ts                          ← Zustand store + AI fetchers
    └── types.ts                              ← all flow types (Side, Phase, TrialAction, FlowState, …)

src/test/
└── flow.ts                                   ← MOCK_CASE, MOCK_OPENINGS, MOCK_CLOSINGS,
                                                MOCK_EVIDENCE_ARGUMENTS, mockLawyerAction,
                                                evidenceTurnsMap (mock-only)
```

No orchestrator component — the four user-callable actions on the flow store are the driving surface.

---

## Open follow-ups

1. **Sustained-ruling rephrase** — currently the trial just continues after a sustain. If we want the speaker to formally rephrase, add a respond-to-ruling endpoint or call `lawyer_action` again right after `approveObjection` with a hint that the previous statement was struck.
2. **Pass-evidence signal** — the mock returns empty `text` to mean "pass." Backend contract for this is TBD (could be empty text, an explicit `action: 'pass'`, or a forced-pass turn cap).
3. **Confidence dynamics** — `confidence: { defense, prosecution }` defaults to 0.5. Should it adjust based on sustained objections / time pressure? Decide once tone-modulation matters for UX.
4. **Cooldowns** — prevent an AI from objecting on every line (rate-limit on the trigger evaluator).
5. **Score tracking** — `case.possible_choices[].score_points` suggests a scoring system. `DebriefResult.score` is already typed as optional; backend can populate it.
6. **Transcript persistence** — currently in-memory only. Mirror to localStorage or backend for resume-after-refresh.
7. **Streaming** — if AI responses stream, `speak()` appends mid-token; lawyer's `setUtterance` already supports incremental updates.
8. **Witness re-introduction** — fourth `activeSpeaker` value plus a `witness_answer` fetcher (the endpoint already exists per `BACKEND_CHANGES.md`).
9. **Backend wiring** — done: `fetchLawyerAction`, `fetchDebrief`, and `caseGenerator.fetchCase` all hit the Django backend at `http://127.0.0.1:8000`. They fall back to the mocks in `src/test/flow.ts` (with a `console.warn`) when the network call fails. Remove the fallbacks + the `MOCK_*` data once the backend is stable in production.
