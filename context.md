# Context: AI Court Simulation Game

## 1. Project Overview
*   **Engine/Tech Stack:** React Three Fiber (R3F).
*   **Core Concept:** A courtroom simulation where the Prosecution and Defense are driven by AI agents, and the Player acts as the Judge.
*   **Primary Objective:** The player does not simply "guess guilt"; rather, they manage fairness, balance the law against persuasion, and manage uncertainty under pressure.
*   **Key Tension:** Real trials are slow; this game compresses procedural delays into choices, legal jargon into mechanics, and passive listening into active interaction.

---

## 2. Core Design Philosophy
*   **Role of the Player:** Referee of truth, balancing the scales of justice, law, and public opinion.
*   **Truth vs. Legal Proof:** The player may know a defendant is guilty but must acquit them if the legal proof is insufficient or tainted. 
*   **The Fun Factor:** Derived from managing uncertainty, exposing contradictions, and making high-stakes decisions under pressure.

---

## 3. Core Gameplay Loop (State Machine)

### State 1: Case Brief (Intro)
*   **Action:** Provide the player with a fast, intriguing overview.
*   **Data Provided:** Crime type (e.g., robbery, homicide), accused identity, key known facts.
*   **Design Rule:** Briefs must be incomplete, slightly biased, or misleading to spark curiosity.

### State 2: Opening Statements
*   **Action:** AI vs. AI narrative generation.
*   **Prosecution AI:** Presents a clean, confident narrative.
*   **Defense AI:** Introduces doubt and alternative explanations.
*   **Player Agency:** Can interrupt, ask for clarification, or flag suspicious claims.

### State 3: Evidence Phase (The Core)
*   **Action:** Proceed in rounds, presenting pieces of evidence (CCTV, witness testimony, forensics, texts).
*   **Player Agency:** 
    *   Allow or reject evidence (Legality mechanic).
    *   Ask targeted questions to either side.
    *   Request deeper analysis (zoom into details, expose inconsistencies).
*   **AI Behavior:** May attempt emotional manipulation, present misleading (but technically true) arguments, or utilize unreliable witnesses.

### State 4: Cross-Examination Duels
*   **Action:** Interactive AI vs. AI challenges.
*   **Player Agency:** Must actively intervene to moderate. 
    *   *Sustain/Overrule:* "Answer the question," "Irrelevant," "Speculation."
    *   *Press:* Force an AI to follow up on a specific contradiction.

### State 5: Closing Arguments
*   **Action:** Both AIs adapt their final statements based dynamically on what evidence was accepted/rejected and what contradictions were exposed during States 3 and 4.

### State 6: Verdict & Consequences
*   **Action:** Player makes the final ruling.
*   **Options:** 
    1. Guilty beyond reasonable doubt.
    2. Not guilty (insufficient evidence).
    3. Case dismissed (procedural/legal issues).
*   **Consequences Revealed:** Did a guilty person walk? Was an innocent convicted? Show shifts in Public Opinion and potential for Appeals.

---

## 4. AI Agent Guidelines & Specifications

### A. Imperfect AI Logic
*   **Rule:** AIs must not be omniscient or perfectly logical. 
*   **Behaviors:** They should occasionally be overconfident, miss minor details, or bluff. The player must be able to outsmart them.

### B. Personality System
*   **Rule:** AI agents must adopt specific persona traits that dictate their argumentative style to ensure replayability.
*   **Archetypes:**
    *   *Aggressive:* Pushes boundaries, objects frequently.
    *   *Manipulative:* Twists words, uses emotional appeals.
    *   *Logical:* Relies strictly on data and forensics, lacks empathy.
    *   *Emotional:* Relies heavily on victim impact and moral arguments.

---

## 5. Under the Hood: Hidden Systems & Variables
Do not expose these raw numbers to the player. Instead, map these variables to visual/textual feedback (e.g., hesitation in AI dialogue, shifts in confidence, UI animations).

*   `credibility_score`: Tracks witness reliability. Can crack under pressure.
*   `consistency_score`: Tracks how well an AI's current argument matches their past statements.
*   `legality_index`: Tracks the amount of tainted/illegal evidence allowed. High counts risk case dismissals.
*   `bias_meter`: Tracks how player interventions favor one side, affecting public perception.

---

## 6. MVP (Minimum Viable Product) Scope
For initial prototyping, restrict the game loop to:
1. Short Case Intro.
2. 3–5 pieces of evidence.
3. Short AI arguments for each piece.
4. Player questions/interventions (allow/reject/object).
5. Verdict selection.
6. Outcome reveal.

---

## 7. Ethical Dilemmas (Scenario Generation Rules)
When generating cases, ensure they occasionally feature:
*   Illegally obtained evidence that objectively proves guilt (Justice vs. Law).
*   Highly emotional victim testimony backed by weak factual evidence.
*   Heavy, biased media pressure that conflicts with courtroom reality.