# AI Agents in TrialPlease-MDS

This document explains the architecture and usage of AI agents in the TrialPlease-MDS project. The agents are designed to simulate a courtroom environment, including lawyers, witnesses, case generation, and an evaluator to ensure the quality of interactions.

## Core Architecture

All agents in the project are built upon a base class called `GeminiAgent`. 
- **Model Used**: By default, the agents use Google's `gemini-2.5-flash` model via the `google-genai` SDK.
- **Output Format**: The agents are strictly instructed to return responses in JSON format. The base class has built-in mechanisms to handle and parse this JSON, ensuring that the outputs are structured and predictable for the game logic.
- **Validation**: Some agents use `Pydantic` schemas to strictly validate the structure of the JSON output (e.g., during evaluation).

## Types of Agents

### 1. `CaseArchitect`
- **Role**: Scenario generation.
- **Function**: Responsible for generating a complete, balanced, and engaging courtroom case. 
- **Output Structure**: It outputs a complex JSON object containing the case name, description, a biased "police report" (what the player sees), the "absolute truth" (hidden from the player), the defendant, victim, evidence items, and witnesses (including their hidden truths).

### 2. `Prosecutor` & `DefenseAttorney` (Inherit from `BaseLawyer`)
- **Role**: Trial adversaries.
- **Function**: These agents act as the lawyers in the courtroom. They receive the current case details, the ongoing trial transcript, and a specific "confidence level".
- **Interaction**:
  - They analyze the transcript to decide whether to make a regular `statement` or raise an `objection` (e.g., hearsay, leading).
  - They react dynamically to the judge's rulings (e.g., if their objection is overruled, they must adapt).
- **Persona**: 
  - `Prosecutor` is prompted to be relentless, logical, and justice-oriented.
  - `DefenseAttorney` is analytical, eloquent, and focuses on finding loopholes in the prosecution's evidence.

### 3. `WitnessAgent`
- **Role**: Testifying character.
- **Function**: Simulates a witness on the stand being questioned by a lawyer.
- **Interaction**: The agent receives the case details, its specific witness persona, previous spoken statements, and the lawyer's question.
- **Mechanic**: It must respond in character, balancing its initial "summary statement" to the police and a secret "hidden truth." If pressured effectively by the lawyers, the witness might let slip pieces of their hidden truth.

### 4. `AIEvaluator`
- **Role**: Quality assurance and game mechanics scoring.
- **Function**: This agent acts as a meta-evaluator to grade the performance of other agents and ensure the game remains coherent and playable.
- **Evaluations Performed**:
  - **Lawyer Replies**: Grades the Prosecutor and Defense based on role adherence, coherence, relevance, and argument quality.
  - **Witness Replies**: Grades witnesses on coherence, relevance, and "reveal control" (how well they managed their hidden truth).
  - **Case Generation**: Evaluates newly generated cases for coherence, legal playability, and completeness.
- **Output Structure**: Uses Pydantic schemas (e.g., `LawyerEvaluationSchema`, `CaseEvaluationSchema`) to ensure the evaluation scores and feedback are strictly typed.

## Agent Workflow Overview

1. **Initialization**: The `CaseArchitect` generates a new case, populating the facts, evidence, and witnesses.
2. **Trial Loop**: 
   - The `Prosecutor` and `DefenseAttorney` take turns reviewing the transcript and making statements or objections.
   - When a witness is called, the `WitnessAgent` responds to questions based on their generated persona.
3. **Evaluation**: Behind the scenes (or for testing), the `AIEvaluator` continuously monitors the outputs to ensure high-quality and consistent AI behavior, scoring the agents on a scale from 1 to 10.
