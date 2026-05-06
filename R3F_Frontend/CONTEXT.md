# Trial system — state architecture

This document is the source of truth for how runtime state is split across stores in the trial gameplay loop. Read it before adding state, refactoring a store, or wiring a new participant.

## Roles in a trial

- **Prosecution (AI)** — argues for guilt, opens first.
- **Defense (AI)** — argues for innocence, rebuts.
- **Judge (User)** — does *not* argue. Two responsibilities only:
  1. Sustain or overrule objections during AI exchanges. *(v1: auto-overruled — UI not yet wired.)*
  2. Deliver the final verdict at the end.
- **No witnesses** in v1. Witness data on `CaseData` is ignored for now.

## Three-store split

| Store              | Persistence | Role                                                                                       |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------ |
| `case-generator`   | Context     | Source of truth for the generated case. Loaded once per trial.                             |
| `lawyer`           | Zustand     | Passive UI state per side: `persona`, `isThinking`, `lastUtterance`. Drives lawyer animations and speech-bubble rendering. **No AI logic.** |
| `flow`             | Zustand     | Turn machine + transcript + **the trial-driving loop**. Calls lawyer setters and the (mocked) AI endpoints. |

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

## Flow store (Zustand) — drives the trial

```ts
type Phase =
  | 'pre_trial'
  | 'opening_prosecution'
  | 'opening_defense'
  | 'evidence_debate'
  | 'closing_prosecution'
  | 'closing_defense'
  | 'verdict'
  | 'concluded'

type AwaitingUser = 'objection_ruling' | 'verdict' | null

type FlowState = {
  // phase machine
  phase: Phase
  activeSpeaker: Side | 'judge' | null

  // evidence sub-loop
  currentEvidenceIndex: number | null
  evidencePassed: { defense: boolean; prosecution: boolean }

  // interrupt state
  pendingObjection: { actionId: string; side: Side; reason: ObjectionReason } | null
  awaitingUser: AwaitingUser

  // log
  transcript: TrialAction[]

  // entry point — also kicks off the async loop
  startTrial(caseInfo: CaseData): void

  // transitions
  advancePhase(): void
  advanceEvidence(): void
  setActiveSpeaker(s: Side | 'judge' | null): void

  // log appenders
  appendAction(a: TrialAction): void
  passEvidence(side: Side, evidenceName: string): void

  // interrupts
  raiseObjection(by: Side, reason: ObjectionReason, targetId: string): void
  ruleOnObjection(ruling: 'sustained' | 'overruled'): void
  deliverVerdict(v: string): void

  reset(): void
}
```

### The driving loop

`startTrial(caseInfo)` snapshots the case to a module-level variable and spawns `runLoop()`. The loop is a `while (true)` that:

1. Returns when `phase` is `pre_trial`/`concluded` or `awaitingUser === 'verdict'`.
2. Otherwise calls `runOneStep()` for the current phase:
   - **opening_prosecution / opening_defense** → fetch opening text → animate speaker (`setThinking` → delay → `setUtterance`) → append action → maybe-objection → `advancePhase()`.
   - **closing_prosecution / closing_defense** → same shape with `fetchClosingStatement`.
   - **evidence_debate** → fetch argument for current speaker; if `null` → `passEvidence`, else animate + append + maybe-objection. Rotate `activeSpeaker`. When both passed → `advanceEvidence` or `advancePhase`.
3. `verdict` phase sets `awaitingUser='verdict'` (set in `advancePhase`) and the loop exits. User clicks → `deliverVerdict` → `phase='concluded'`.

A module-scope `loopRunning` flag prevents double-spawning if `startTrial` is called twice.

### AI fetchers (mocked, with commented backend calls)

All response generators live as private functions inside `flowStore.ts`:

```ts
async function fetchOpeningStatement(side: Side): Promise<string>
async function fetchClosingStatement(side: Side): Promise<string>
async function fetchEvidenceArgument(side: Side, evidenceName: string): Promise<string | null>
async function fetchObjectionDecision(side: Side, opponentAction): Promise<{ objects: false } | { objects: true; reason: ObjectionReason }>
async function fetchRulingResponse(side: Side, ruling): Promise<string | null>
```

Each contains a commented-out `fetch('/api/lawyer/respond/', ...)` block plus the current `MOCK_*` fallback from `src/test/flow.ts`. Swap the comment direction when the backend is live.

### Per-evidence turn tracking

A module-scope `Map<string, number>` (`evidenceTurnsMap`) tracks how many scripted arguments each `(side, evidence)` has delivered. Cleared on `startTrial` and `reset`. Not part of `FlowState` — promote into state if save/resume is added.

### Objection auto-decline (v1)

`maybeRaiseObjection(action)` evaluates the opposite side via `fetchObjectionDecision`. If they object, the loop calls `raiseObjection` (transcript records it) then immediately `ruleOnObjection('overruled')` after a 400ms cosmetic delay. **No user pause.** Objections are visible in the transcript only.

To wire user-controlled rulings later: replace the auto-overrule with a Promise that resolves when `ruleOnObjection` is called externally (HUD button), and on a sustained ruling call `fetchRulingResponse(action.side, 'sustained')` to append the rephrase.

### Key invariants

- `awaitingUser !== null` ⇒ loop must not initiate new AI work until cleared.
- `pendingObjection !== null` ⇔ `awaitingUser === 'objection_ruling'` (transient under auto-decline).
- `currentEvidenceIndex !== null` ⇔ `phase === 'evidence_debate'`.

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
    └── flowStore.ts                          ← Zustand store + driving loop + AI fetchers

src/test/
└── flow.ts                                   ← MOCK_CASE, MOCK_OPENINGS, MOCK_CLOSINGS,
                                                MOCK_EVIDENCE_ARGUMENTS, objection triggers,
                                                helpers used by flow's mock fetchers
```

No `TrialOrchestrator` component — the loop lives inside `flowStore.ts` now.

---

## Open follow-ups

1. **User-controlled objection rulings** — replace `maybeRaiseObjection`'s auto-overrule with a Promise that resolves on `ruleOnObjection`, plus the sustained-ruling rephrase append.
2. **Cooldowns** — prevent an AI from objecting on every line (rate-limit on the trigger evaluator).
3. **Score tracking** — `case.possible_choices[].score_points` suggests a scoring system. Add `score: number` to flow or a future `result-store`.
4. **Transcript persistence** — currently in-memory only. Mirror to localStorage or backend for resume-after-refresh.
5. **Streaming** — if AI responses stream, the speak helper appends mid-token; lawyer's `setUtterance` already supports incremental updates.
6. **Witness re-introduction** — fourth `activeSpeaker` value and a `requestWitnessQuestion` fetcher.
7. **Backend wiring** — uncomment the `fetch` blocks in flowStore.ts and remove the `MOCK_*` fallbacks; one universal `POST /api/lawyer/respond/` endpoint expected.
