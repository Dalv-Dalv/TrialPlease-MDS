# Trial system — state architecture

This document is the source of truth for how runtime state is split across stores in the trial gameplay loop. Read it before adding state, refactoring a store, or wiring a new participant.

## Roles in a trial

- **Prosecution (AI)** — argues for guilt, opens first.
- **Defense (AI)** — argues for innocence, rebuts.
- **Judge (User)** — does *not* argue. Two responsibilities only:
  1. Sustain or overrule objections during AI exchanges.
  2. Deliver the final verdict at the end.
- **No witnesses** in v1. Witness data on `CaseData` is ignored for now.

## Three-store split

| Store              | Persistence | Role                                                                 |
| ------------------ | ----------- | -------------------------------------------------------------------- |
| `case-generator`   | Context     | Source of truth for the generated case. Loaded once per trial.       |
| `lawyer`           | Context     | The two AI personas. Generates utterances and decides on objections. |
| `flow`             | Zustand     | Turn machine + transcript. Drives the trial loop.                    |

### Dependency direction (one-way)

```
case-generator  ←  lawyer  ←  flow  ←  TrialOrchestrator
                     ↑                       │
                     └───────────────────────┘
                        (orchestrator calls lawyer methods)
```

- `case-generator` has zero dependencies on other stores.
- `lawyer` reads `case-generator` (to ground prompts) and `flow.transcript` (for context). It does **not** import flow's actions.
- `flow` reads `case-generator` (e.g. evidence list length) and observes lawyer state (`isThinking`). It does **not** import lawyer methods.
- The `TrialOrchestrator` component is the **only** place that calls lawyer methods in response to flow transitions. Stores stay pure and individually testable.

### Why Zustand for flow only

Context re-renders every consumer on any state change. `flow.activeSpeaker` and `pendingObjection` flip frequently, and many components watch them (3D scene, speech bubbles, objection modal). Zustand's selector subscriptions keep re-renders local. `case-generator` and `lawyer` change in coarse, infrequent steps — Context is fine there.

If the lawyer ever streams tokens (token-by-token speech rendering), revisit and move it to Zustand.

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

For each evidence item, AIs alternate freely. Each AI turn produces either an **argument** or a **pass**. Pass semantics:

- `evidencePassed[side] = true` when that side passes.
- A side speaking (argument) **resets the opponent's pass flag** — new material on the table means your opponent gets another chance to respond.
- When both flags are `true` simultaneously (no intervening utterance), orchestrator advances `currentEvidenceIndex`.
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

## Flow store (Zustand)

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
  awaitingUser: AwaitingUser    // pauses AI when non-null

  // log
  transcript: TrialAction[]

  // transitions
  startTrial(): void
  advancePhase(): void
  advanceEvidence(): void          // ++currentEvidenceIndex, reset pass flags
  setActiveSpeaker(s: Side | 'judge' | null): void

  // log appenders (used by orchestrator)
  appendAction(a: TrialAction): void
  passEvidence(side: Side, evidenceName: string): void

  // user-driven
  raiseObjection(by: Side, reason: ObjectionReason, targetId: string): void
  ruleOnObjection(ruling: 'sustained' | 'overruled'): void
  deliverVerdict(v: string): void

  reset(): void
}
```

### Key invariants

- `awaitingUser !== null` ⇒ orchestrator must not call any lawyer method until cleared.
- `pendingObjection !== null` ⇔ `awaitingUser === 'objection_ruling'`.
- `currentEvidenceIndex !== null` ⇔ `phase === 'evidence_debate'`.
- `evidencePassed.defense && evidencePassed.prosecution` should be transient — orchestrator advances on the next tick.

---

## Lawyer store (Context, two sides in one store)

```ts
type LawyerSideState = {
  persona: { name: string; style: string }
  isThinking: boolean
  lastUtterance: string | null
}

type LawyerResponse =
  | { kind: 'evidence_argument'; text: string }
  | { kind: 'pass_evidence' }

type ObjectionDecision =
  | { objects: false }
  | { objects: true; reason: ObjectionReason }

type LawyerStore = {
  defense: LawyerSideState
  prosecution: LawyerSideState

  // primary speech generators
  requestOpeningStatement(side: Side): Promise<string>
  requestClosingStatement(side: Side): Promise<string>
  requestEvidenceArgument(side: Side, evidenceName: string): Promise<LawyerResponse>
    // AI may return pass_evidence if it has nothing more to add

  // recovery after a sustained objection
  respondToRuling(side: Side, ruling: 'sustained' | 'overruled'): Promise<string | null>

  // called for the OPPOSITE side after every opponent action
  evaluateObjection(side: Side, opponentAction: TrialAction): Promise<ObjectionDecision>

  reset(): void
}
```

All methods read `caseInfo` from `case-generator` and `transcript` from `flow` to build prompts. The lawyer store does not duplicate either.

---

## TrialOrchestrator (the glue)

A headless component (`<TrialOrchestrator />`) that subscribes to flow and drives lawyer calls. Mounted once near the root, inside all three providers.

### Responsibilities

```
on phase transition →
  if phase needs an AI utterance (opening, closing, evidence_debate) →
    determine side (prosecution first, alternating per phase rules)
    call appropriate lawyer.requestX
    on resolve → flow.appendAction or flow.passEvidence

on transcript append →
  if last action was by an AI side X →
    lawyer.evaluateObjection(opposite of X, last action)
    if objects → flow.raiseObjection
    (this sets awaitingUser = 'objection_ruling', pausing further AI)

on flow.ruleOnObjection (user-driven) →
  if sustained → lawyer.respondToRuling(speakingSide, 'sustained')
                  → append rephrased utterance
  if overruled → continue: AI sequence resumes naturally

on evidencePassed.defense && evidencePassed.prosecution →
  flow.advanceEvidence() (or advancePhase if last evidence)

on phase = 'verdict' →
  flow.awaitingUser = 'verdict'
  user picks → flow.deliverVerdict → phase = 'concluded'
```

### Pause discipline

The orchestrator must check `awaitingUser` before kicking off any AI work. The simplest pattern is a single `useEffect` keyed on the relevant flow slice that no-ops when `awaitingUser !== null`.

---

## Open follow-ups (post-v1)

1. **Objection cooldowns** — prevent an AI from objecting on every single line. Add a per-side cooldown counter, or rate-limit in the prompt.
2. **Score tracking** — `case.possible_choices[].score_points` suggests a scoring system. Score state could live on flow (`score: number`) or in a future `result-store`.
3. **Transcript persistence** — currently in-memory only. If we want resume-after-refresh, mirror to localStorage or backend.
4. **Streaming** — if AI responses stream, lawyer store moves to Zustand to avoid full-tree re-renders per token.
5. **Witness re-introduction** — when added back, witness becomes a fourth `activeSpeaker` value and `requestWitnessQuestion` returns to lawyer.

---

## File layout

```
src/store/
├── auth.tsx                                  ← existing
├── authContext.ts                            ← existing
├── case-generator-store/
│   ├── caseGeneratorStore.tsx                ← existing (provider)
│   └── caseGeneratorContext.ts               ← existing (types + hook)
├── lawyer-store/
│   ├── lawyerStore.tsx                       ← provider
│   └── lawyerContext.ts                      ← types + useLawyers hook
└── flow-store/
    └── flowStore.ts                          ← Zustand store (no provider needed)

src/pages/trial/
└── orchestrator/
    └── TrialOrchestrator.tsx                 ← headless effect component
```

Zustand stores don't need a provider, so `flow-store/` is a single `.ts` file.
