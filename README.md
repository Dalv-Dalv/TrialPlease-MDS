# ⚖️ TrialSim AI: The Virtual Courtroom

## 📖 Project Overview
TrialSim AI is an interactive, AI-driven courtroom simulator where the user steps into the shoes of a **Judge**. Navigating dynamic, procedurally generated legal cases, the user must oversee the courtroom proceedings, rule on objections, and ultimately deliver a verdict. 

The twist? The prosecution, the defense, and the underlying case are entirely generated and driven by **Agentic AI**. The user's performance is scored based on their adherence to legal logic, handling of courtroom events, and the accuracy of their final verdict compared to the hidden "truth" established by the AI.

---

## 🎮 Core Gameplay & Mechanics

### 1. The User (The Judge)
* **Courtroom Management:** The user listens to arguments, cross-examinations, and opening/closing statements.
* **Active Rulings:** The user must respond to dynamic events, such as sustaining or overruling objections raised by the AI lawyers.
* **The Verdict:** At the end of the trial, the user must decide if the defendant is **Guilty** or **Not Guilty**.
* **Scoring System:** Points are awarded or deducted based on:
    * Making the "correct" verdict (matching the hidden truth parameters set during case generation).
    * Correctly ruling on procedural objections (e.g., hearsay, leading the witness).

### 2. The AI Agents
The simulator relies on a multi-agent AI architecture:
* **The Architect (Case Generator AI):** Before the trial begins, this agent generates the entire case file—the crime, the evidence, witness profiles, and the definitive, hidden "truth" of what actually happened.
* **The Prosecutor AI:** Programmed to aggressively pursue a guilty verdict using the evidence provided. It will formulate arguments, question simulated witnesses, and object to the defense.
* **The Defense AI:** Programmed to introduce reasonable doubt and protect the defendant. It will cross-examine witnesses, present counter-arguments, and object to the prosecution.

---

## 🔄 The Trial Flow

1.  **Case Generation:** The Architect AI generates a unique case and provides the Judge (user) with a case summary and docket.
2.  **Opening Statements:** Prosecutor AI and Defense AI present their initial arguments.
3.  **Witness Examination:** AI lawyers take turns questioning "witnesses" (which can be handled by the Case Generator AI acting as NPCs). Lawyers will interject with objections that the Judge must rule on.
4.  **Closing Arguments:** Both AI agents summarize their cases.
5.  **Deliberation & Verdict:** The Judge submits their final decision.
6.  **Post-Trial Debrief (Scoring):** The system reveals the hidden truth, grades the Judge's verdict, evaluates their rulings on objections, and displays the final score.
