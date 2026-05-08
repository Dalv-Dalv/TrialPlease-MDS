# Flow store — refactor plan

This document describes the planned refactor of `flowStore.ts` to align with the backend defined in `BACKEND_CHANGES.md` and the simpler UI-driven control surface requested.

## Goals

1. Replace the auto-driving `runLoop` with **four user-callable functions** that the UI invokes explicitly:
   - `advanceTurn()`
   - `raiseObjection(by, reason, targetId)`
   - `approveObjection()`
   - `opposeObjection()`
2. Collapse the five mock fetchers into a single `fetchLawyerAction()` that mirrors `POST /api/cases/<id>/lawyer_action/` (statement-or-objection in one call).
3. Wire `deliverVerdict` to `POST /api/cases/<id>/debrief/` so the post-game summary has access to the absolute truth.
4. Keep the lawyer Zustand store as passive UI state — flow updates `isThinking` / `lastUtterance` exactly as today.

## What the backend gives us

| Endpoint                                | Replaces (current code)                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `POST /api/cases/generate/`             | already wired in case-generator (just swap MOCK out)     |
| `POST /api/cases/<id>/lawyer_action/`   | `fetchOpeningStatement`, `fetchClosingStatement`, `fetchEvidenceArgument`, `fetchObjectionDecision` — **all four** |
| `POST /api/cases/<id>/witness_answer/`  | not used in v1 (no witnesses)                            |
| `POST /api/cases/<id>/debrief/`         | new — called from `deliverVerdict`                       |

The lawyer_action response shape:
```ts
type LawyerActionResponse =
  | { action: 'statement';  text: string;   confidence_level: number }
  | { action: 'objection';  reason: ObjectionReason; confidence_level: number }
```

The model decides per call whether to speak normally or to object to the most recent opposing action. The flow store does **not** ask separately for objections.

## New public surface

```ts
type FlowState = {
  // … existing state stays …

  // === user-callable trial control ===
  advanceTurn(): Promise<void>
  raiseObjection(by: Side, reason: ObjectionReason, targetId: string): void
  approveObjection(): void
  opposeObjection(): void

  // === existing entry points kept ===
  startTrial(caseInfo: CaseData): void
  deliverVerdict(verdict: string): Promise<DebriefResult>
  reset(): void
}
```

`startTrial` no longer spawns a loop — it just initializes state and yields control to the UI. `runLoop`, `runOneStep`, `maybeRaiseObjection`, `speak` (as a helper) remain internally, but the public surface is the four functions above plus `startTrial` / `deliverVerdict` / `reset`.

### `advanceTurn()`

1. **Bail conditions**: if `awaitingUser !== null`, or `phase` is `pre_trial` / `verdict` / `concluded`, return without doing anything (UI shouldn't be calling here).
2. **Determine the speaker** for this turn from `phase` + `activeSpeaker` (same logic that's currently inside `runOneStep`).
3. **Call `fetchLawyerAction(side, confidence, transcript)`**. Animate the lawyer (`setThinking → delay → setUtterance`) to keep the speech-bubble UX.
4. **Branch on the response**:
   - `statement` → `appendAction({ kind: 'opening_statement' | 'closing_statement' | 'evidence_argument', side, text, … })`, then `advancePhase()` / `advanceEvidence()` / rotate `activeSpeaker` per the same rules as today.
   - `objection` → call `raiseObjection(side, reason, lastOpposingActionId)` internally. Speaker stays where they are; user must rule before another `advanceTurn` does anything.
5. **Pass-evidence shortcut**: when the API returns an empty / null statement during `evidence_debate`, treat it as a `pass_evidence` and rotate. (Backend signal TBD — see open questions.)

`advanceTurn` returns a Promise so the UI can disable the Continue button while in flight.

### `raiseObjection(by, reason, targetId)`

Same as today: appends an `objection` action, sets `pendingObjection` and `awaitingUser = 'objection_ruling'`. UI shows the Sustain / Overrule buttons. **No auto-overrule.**

Public so the UI can also raise an objection on behalf of a side for testing or for future "let the user trigger an objection" mechanics. In the normal flow it's only called from inside `advanceTurn`.

### `approveObjection()` (sustained)

1. Append `objection_ruling` action with `ruling: 'sustained'`.
2. Clear `pendingObjection` and `awaitingUser`.
3. **Side-effect: nothing else.** The trial continues on the next `advanceTurn`. The original statement stays in the transcript but the AI sees it was sustained — it can adjust on the next turn.
4. (No `respondToRuling` endpoint exists in the backend, so we're not auto-rephrasing. If the design later wants a rephrase, it'd be a follow-up `lawyer_action` call inside `approveObjection` — flagged in open questions.)

### `opposeObjection()` (overruled)

1. Append `objection_ruling` action with `ruling: 'overruled'`.
2. Clear `pendingObjection` and `awaitingUser`.
3. Done — UI calls `advanceTurn` next.

### `deliverVerdict(verdict): Promise<DebriefResult>`

```ts
type DebriefResult = {
  correct: boolean
  absolute_truth: string
  // whatever else /debrief/ returns
}
```

1. Append `verdict` action.
2. Set `phase = 'concluded'`, `awaitingUser = null`.
3. `await fetch('/api/cases/<id>/debrief/', { verdict })`.
4. Return the debrief payload to the UI for the post-game screen. Optionally store it in flow state (`debrief: DebriefResult | null`).

## What gets deleted / collapsed

- `runLoop` and `loopRunning`
- `runOneStep`
- `speak` becomes a helper invoked from `advanceTurn` (still updates lawyer store)
- `maybeRaiseObjection` — folded into `advanceTurn`'s `objection` branch
- `fetchOpeningStatement`, `fetchClosingStatement`, `fetchEvidenceArgument`, `fetchObjectionDecision`, `fetchRulingResponse` — replaced by:

```ts
async function fetchLawyerAction(
  caseId: number,
  side: Side,
  confidence: number,
  transcript: TrialAction[],
): Promise<LawyerActionResponse> {
  // const res = await fetch(`http://127.0.0.1:8000/api/cases/${caseId}/lawyer_action/`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ lawyer_type: side === 'prosecution' ? 'prosecutor' : 'defense', confidence_level: confidence, transcript }),
  // })
  // return await res.json()
  return mockLawyerAction(side, confidence, transcript) // pulls from MOCK_OPENINGS / MOCK_CLOSINGS / MOCK_EVIDENCE_ARGUMENTS / MOCK_OBJECTION_TRIGGERS based on phase
}
```

The mock implementation in `test/flow.ts` will need a new helper `mockLawyerAction()` that:
- Inspects the latest transcript entry to figure out current phase / what side just spoke.
- Returns a statement (drawn from the existing scripts) **or** an objection (drawn from the existing triggers if the previous statement matches a trigger).
- This preserves the deterministic feel of the current mock while matching the new endpoint shape.

## State changes

Adding to `FlowState`:
- `caseId: number | null` — captured by `startTrial` so `lawyer_action` and `debrief` calls can reference it. (Backend uses `<id>` in the URL.)
- `confidence: { defense: number; prosecution: number }` — passed to `lawyer_action`. Default 0.5; can be modulated later (e.g. lower confidence after a sustained objection against your statement).
- `debrief: DebriefResult | null` — populated after `deliverVerdict` resolves.

Removing module-scope state that's no longer needed:
- `loopRunning` (no loop)
- `currentCase` (replaced by `caseId` in state + the case stays in the case-generator context for any UI that needs full case data)
- `evidenceTurnsMap` — moved into the mock implementation in `test/flow.ts`, since it's a mock-only concern (the backend tracks its own context via the transcript).

## Migration steps

1. Add the new types and `fetchLawyerAction` (commented backend call + mock fallback).
2. Add the four new methods on `FlowState`: `advanceTurn`, `raiseObjection`, `approveObjection`, `opposeObjection`. Keep current `raiseObjection` / `ruleOnObjection` semantics; rename `ruleOnObjection` → split into `approveObjection` (sustained) + `opposeObjection` (overruled) for the cleaner UI surface.
3. Strip `runLoop` / `runOneStep` / `maybeRaiseObjection` / the per-action fetchers / `speak` (or fold `speak` inline into `advanceTurn`).
4. Update `startTrial` to take `(caseInfo, caseId)` (or extract caseId from caseInfo if the backend includes it on the case object).
5. Update `deliverVerdict` to async + debrief call, return `DebriefResult`.
6. Update HUD:
   - Show **"Continue"** button whenever `awaitingUser === null && phase` is in an AI-driven phase. Wire to `advanceTurn`.
   - Sustain → `approveObjection`, Overrule → `opposeObjection`. (Rename internal handlers; existing wiring stays the same.)
   - Verdict choice → `deliverVerdict(choice)` — UI awaits and renders the debrief afterwards.
7. Update `test/flow.ts` to add `mockLawyerAction()` consuming existing scripts.
8. Update `CONTEXT.md` to reflect the user-paced model.

## What changes for the UI

| State                                    | Today (auto-loop)                                 | After refactor (UI-driven)                                       |
| ---------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| Trial in progress, between turns         | nothing — loop just runs                          | **Continue** button visible; user clicks to call `advanceTurn`   |
| Objection pending                        | auto-overruled after 2s                           | Sustain / Overrule buttons; user must click                      |
| Verdict phase                            | Verdict choices                                   | Verdict choices (unchanged); on click → debrief screen           |

The "reading time" delay inside `speak()` becomes irrelevant — utterances stay on screen until the user clicks Continue.

## Open questions

1. **Sustained-ruling rephrase** — `BACKEND_CHANGES.md` doesn't mention a respond-to-ruling endpoint. Confirm we're fine with the trial just continuing after a sustain (no auto-rephrase). If you want the speaker to rephrase, we'd need either a new endpoint or an extra `lawyer_action` call right after the ruling.

2. **Pass evidence signal** — the backend doc doesn't say how `lawyer_action` indicates "I have nothing more to add on this evidence." Options:
   - Backend returns `{ action: 'statement', text: '' }` → flow treats empty text as pass.
   - Backend adds a third action variant `{ action: 'pass' }`.
   - Flow-side heuristic: cap N turns per evidence and force pass after that.
   Need to align with the backend implementer.

3. **Confidence tracking** — what drives `confidence_level`? Time? Number of sustained objections against you? For v1 I'll default to 0.5 each. We can iterate.

4. **"raiseObjection" as a user-callable function** — in the normal flow only `advanceTurn` calls it. Exposing it publicly makes sense for tests / debug, but if you don't want it as a UI surface, it can be made private.

5. **caseId source** — `Case` has an `id` from the database. Confirm `case-generator` already returns this on the `caseInfo` object so `startTrial(caseInfo)` can read it. (If not, the case generator needs to surface it.)

6. **debrief storage** — should `DebriefResult` live in `FlowState` (so HUD/result-screen can both read it) or be returned only from `deliverVerdict`'s promise (UI keeps it locally)? I'd lean toward state for visibility and persistence of the post-game screen on remount.

---

Once you sign off (and answer the open questions, especially 1 and 2), I'll execute the migration steps in order.
