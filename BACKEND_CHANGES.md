# TrialSim AI: Backend Architecture Updates

This document summarizes the changes made to the Django Backend to transition the game from a static case-loader to a fully dynamic, agent-driven courtroom simulation.

## 1. Database Schema Updates (`models.py` & `serializers.py`)
To support the game's core mechanic (where the player must uncover the truth), the database models were updated to separate biased information from objective reality.
*   **`Case` Model**:
    *   Added `police_report`: A slightly biased summary pointing towards the defendant's guilt. This is what the player reads in the Case Tablet.
    *   Added `absolute_truth`: The hidden reality of the events, kept strictly server-side until the trial ends.
*   **`Witness` Model**:
    *   Added `hidden_truth`: A secret the witness is hiding or lying about.

## 2. API Endpoints (`views.py`)
The `CaseViewSet` was extended with custom `@action` decorators to manage the trial state dynamically via REST POST requests.

*   **`POST /api/cases/generate/`**
    *   Calls the Gemini AI to generate a balanced case.
    *   Saves the `Case`, `Witnesses`, `Evidence`, and `Choices` to the SQLite DB automatically.
    *   Returns the full case object.
*   **`POST /api/cases/<id>/lawyer_action/`**
    *   Takes a `lawyer_type` (prosecutor/defense), a `confidence_level`, and the current trial `transcript`.
    *   Returns a JSON object containing either an `"action": "statement"` or an `"action": "objection"` (with a reason).
*   **`POST /api/cases/<id>/witness_answer/`**
    *   Takes a `witness_id` and the player's `question`.
    *   Fetches the witness's `hidden_truth` from the database and feeds it to the AI so the witness can dynamically respond (and potentially slip up if pressured).
*   **`POST /api/cases/<id>/debrief/`**
    *   Takes the player's final `verdict`.
    *   Evaluates it against the `correct_verdict` and returns the `absolute_truth` for the post-game summary screen.

## 3. Generative AI Service (`ai_service.py`)
The prompts and configuration for Google GenAI (`gemini-2.5-flash`) were completely overhauled to support real-time game flow.

*   **Dynamic Lawyer Logic**: Lawyers now parse the trial transcript and react contextually. They use a `confidence_level` parameter to dictate their tone (aggressive vs. flustered).
*   **Witness Interrogation**: Witnesses are now fed their `hidden_truth` during generation, allowing them to lie consistently but break character if the player asks a clever question.
*   **Speed Optimization**: 
    *   Lowered the `temperature` to `0.4` to prevent the AI from generating excessive creative fluff.
    *   Added explicit instructions (`Keep your dialogue concise, punchy, and under 3 sentences. Do not monologue.`) to force the API to finish its generation rapidly, solving long wait times during the game loop.

## 4. Standalone Testing Tools
Two standalone scripts were added to the `Django_Backend` root directory to allow rapid testing without starting the React frontend:

1.  **`test_ai_lawyers.py`**: Tests the raw output of the AI prompts bypassing Django entirely. Useful for testing prompt engineering.
2.  **`simulate_backend_flow.py`**: A "dummy frontend" that uses `urllib` to hit all API endpoints sequentially (`generate` -> `lawyer_action` -> `witness_answer` -> `debrief`), validating the entire server architecture.
