# agentsStore — Prosecutor & Defense (frontend)

Zustand store for the two courtroom AI agents. Holds only the **public, frontend-visible** projection of each agent — what they've said and done in open court. Private briefings, strategy, and the hidden truth never leave the backend.

Location: `src/features/agents/`

---

## 1. Scope

**In scope (frontend):**
- Public identity of each agent (role, display name).
- Live utterance + transcript history.
- Public record of each agent's courtroom actions: evidence introduced, witnesses called, objections raised.
- UI status flags (idle / thinking / speaking / objecting / passing).
- A single event ingress that translates backend messages into state mutations.

**Out of scope (backend owns these):**
- Each agent's private briefing, strategy, reasoning, and notes.
- The ground-truth case data and any evidence not yet introduced in open court.
- Whether an objection is valid, whether a question is leading, etc. — all adjudication logic.
- Prompt construction, AI model calls, and role-based data filtering.

---

## 2. Role-Based Data Access (how the backend partitions)

Each agent has limited access to case details — e.g. the prosecution may have evidence the defense has not been served with. That asymmetry is enforced **entirely on the backend**:

```
caseStore (backend, authoritative)
   ├── ground truth (never leaves server)
   ├── prosecutor.brief  ──→  only sent to Prosecutor agent's prompt
   └── defense.brief     ──→  only sent to Defense agent's prompt

frontend agentsStore  ──  sees only what enters the public record
```

The frontend receives a stream of **public-record events**: "Prosecutor introduced Evidence P-4", "Defense called Witness W-2", "Prosecutor objected: leading." The judge (user) sees these naturally; anything still private stays on the server.

> **Rule:** if a field in this store could leak what an agent privately knows but has not yet disclosed in court, it does not belong here.

---

