# 👑 MasterOrchestratorAgent — Architectural Specification & Technical Guide

`backend/app/agents/orchestrator.py`

---

## 📌 Executive Summary

The **`MasterOrchestratorAgent`** is the central conductor and pipeline coordinator of Calora AI. It manages the end-to-end execution lifecycle for every spoken voice note or typed input, orchestrating the 6 specialized sub-agents into a unified, atomic pipeline.

It features:
1. **Context & Profile Aggregator**: Pre-loads user bodyweight, dietary preferences, and lifelong habit memories from SQLite before triggering processing.
2. **Intent Dispatcher**: Calls `IntentAgent` and branches dynamically across `meal`, `workout`, `both`, `advice`, or `unknown`.
3. **Pre-Log Protection Gatekeeper**: Decides whether parsed data is clean to auto-commit or must be held in a pending state for clarification.
4. **Compound Event Synchronizer**: Handles dual-intent voice logs (e.g., *"Ran 5k and drank a protein shake"*) by executing `WorkoutAgent` and `NutritionAgent` in tandem.
5. **Unified Response Envelope**: Generates an atomic `AgentProcessResponse` payload consumed by the React dashboard for instant confetti, timeline updates, and notification banners.

---

## 🏛️ Internal Architecture & Master Orchestration Flow Diagram

```mermaid
flowchart TD
    %% Styling Classes
    classDef inputNode fill:#065f46,stroke:#34d399,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef contextNode fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#ffffff;
    classDef orchNode fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#ffffff,font-weight:bold;
    classDef agentNode fill:#1e293b,stroke:#94a3b8,stroke-width:1.5px,color:#ffffff;
    classDef decision fill:#78350f,stroke:#fbbf24,stroke-width:2px,color:#ffffff;
    classDef dbNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef outputNode fill:#2e1065,stroke:#a855f7,stroke-width:2px,color:#ffffff;

    %% Entry
    INPUT["📥 Input: Raw Transcript (via /api/voice/process-audio or process-text)"]:::inputNode

    %% 1. Profile & Memory Context Loading
    subgraph STAGE1 ["1️⃣ Context & Memory Hydration"]
        LOAD_PROF["UserProfile Query<br/>• weight_kg (e.g. 75kg)<br/>• dietary_preference (e.g. Veg)"]:::contextNode
        LOAD_MEM["MemoryAgent.get_user_context()<br/>• habits, restrictions, favorites"]:::contextNode
    end

    %% 2. Master Orchestrator Core
    subgraph STAGE2 ["2️⃣ Master Orchestrator Dispatcher (orchestrator.py)"]
        ORCH["👑 MasterOrchestratorAgent.process_voice_transcript()"]:::orchNode
        INTENT_CALL["⚡ IntentAgent.parse_intent(transcript)"]:::agentNode
    end

    %% 3. Dynamic Pipeline Branching
    subgraph STAGE3 ["3️⃣ Specialized Agent Execution"]
        NUTRI_CALL["🍛 NutritionAgent.parse_meal()<br/>• Extracts multi-meals & macros"]:::agentNode
        WORKOUT_CALL["🏋️ WorkoutAgent.parse_workout()<br/>• Calculates MET calorie burn"]:::agentNode
        ADVICE_CALL["💡 Guidance Recommender<br/>• Answers health questions"]:::agentNode
    end

    %% 4. Ambiguity Verification Gate
    subgraph STAGE4 ["4️⃣ Ambiguity Check & Verification"]
        CLARIFY_CALL["🔍 ClarificationAgent.check_ambiguities()<br/>• Verifies omitted variables (>15% delta)"]:::agentNode
        DECISION{"🛡️ Any Ambiguity<br/>(>15% Delta)?"}:::decision
    end

    %% 5. Persistence & Delivery
    subgraph STAGE5 ["5️⃣ Persistence & Envelope Packaging"]
        COMMIT_DB[("💾 SQLite Database<br/>• Writes to meal_logs / workout_logs")]:::dbNode
        HOLD_PENDING["⚡ Hold in Pending State<br/>• Prepares ClarificationBanner UI"]:::agentNode
        ENVELOPE["📦 AgentProcessResponse<br/>• transcript, intent, meals[], workout, clarifications[], insights[], status"]:::outputNode
    end

    %% Flow Connections
    INPUT --> ORCH
    LOAD_PROF & LOAD_MEM --> ORCH
    ORCH --> INTENT_CALL

    INTENT_CALL -->|Intent: Meal| NUTRI_CALL
    INTENT_CALL -->|Intent: Workout| WORKOUT_CALL
    INTENT_CALL -->|Intent: Both| NUTRI_CALL & WORKOUT_CALL
    INTENT_CALL -->|Intent: Advice| ADVICE_CALL

    NUTRI_CALL & WORKOUT_CALL --> CLARIFY_CALL
    CLARIFY_CALL --> DECISION

    DECISION -->|NO: Clean Input (0 Ambiguities)| COMMIT_DB
    DECISION -->|YES: Ambiguities Found| HOLD_PENDING

    COMMIT_DB & HOLD_PENDING & ADVICE_CALL --> ENVELOPE

    %% Color-coded Links
    linkStyle 0,1,2,3 stroke:#38BDF8,stroke-width:2px;
    linkStyle 4,5,6,7 stroke:#F59E0B,stroke-width:2px;
    linkStyle 8,9 stroke:#34D399,stroke-width:2px;
    linkStyle 10,11 stroke:#EA580C,stroke-width:2px;
    linkStyle 12,13,14 stroke:#A855F7,stroke-width:2px;
```

---

## 🔍 Exhaustive Feature Breakdown

### 1. Context Hydration & Memory Ingestion
Before executing any NLP or parsing tasks, `MasterOrchestratorAgent` hydrates the execution state:
* **User Profile**: Weight (for MET burn calculations), Calorie Target, Dietary Preference (Veg / Non-Veg / Vegan).
* **Habit Memory**: Ingests learned habits from `MemoryAgent` (e.g. *"drinks black coffee"*, *"roti without ghee"*).

---

### 2. Multi-Intent Routing Matrix

| Intent Value | Trigger Condition | Agents Dispatched | Resulting Action |
| :---: | :--- | :--- | :--- |
| **`"meal"`** | Food items, drinks, or portions detected. | `NutritionAgent`, `ClarificationAgent` | Extracts dishes, computes macros, and saves to `meal_logs`. |
| **`"workout"`** | Exercises, lifts, cardio, or metrics detected. | `WorkoutAgent`, `ClarificationAgent` | Calculates MET burn and saves to `workout_logs`. |
| **`"both"`** | Compound sentence containing food AND exercise. | `NutritionAgent`, `WorkoutAgent`, `ClarificationAgent` | Processes both pipelines concurrently. |
| **`"advice"`** | Question marks or health query verbs. | Conversational Guidance | Synthesizes helpful advice and tips. |
| **`"unknown"`** | Empty transcript or background ambient noise. | Fallback Tip Engine | Returns helpful microphone speaking tips. |

---

### 3. Pre-Log Protection Decision Engine

The Orchestrator implements strict **Pre-Log Protection**:

```python
if auto_save and detected_meals:
    if len(clarifications) == 0:
        # PATH A: Zero Ambiguities -> Immediate Persistence
        for dm in detected_meals:
            db_meal = MealLog(...)
            db.add(db_meal)
        db.commit()
        insights.append(f"Logged {dm.meal_title} ({dm.calories} kcal, {dm.protein_g}g Protein)")
    else:
        # PATH B: Ambiguities Found -> Hold in Pending State
        logger.info("[Orchestrator] Holding meals in pending state awaiting user clarification.")
        insights.append("Please confirm preparation details below to finalize.")
```

---

### 4. Unified Response Envelope (`AgentProcessResponse`)

Every call to `MasterOrchestratorAgent` returns an atomic, type-safe schema:

```python
class AgentProcessResponse(BaseModel):
    transcript: str
    intent: str  # "meal" | "workout" | "both" | "advice" | "unknown"
    detected_meal: Optional[MealLogCreate]
    detected_meals: List[MealLogCreate]
    detected_workout: Optional[WorkoutLogCreate]
    clarifications: List[ClarificationItem]
    insights: List[str]
    status: str  # "success" | "clarification_needed" | "error"
```

---

## 🧪 Sample Ingestion Benchmarks

| Spoken Transcript | Intent | Pipeline Path | Status Returned |
| :--- | :---: | :--- | :---: |
| `"2 rotis with dal tadka"` | `meal` | `NutritionAgent` ➔ 0 Ambiguities ➔ SQLite Auto-Save | `success` 🎉 |
| `"Had 2 parathas and a cup of chai"` | `meal` | `NutritionAgent` ➔ Clarification Triggered ➔ Held in Pending | `clarification_needed` 🛡️ |
| `"Ran 5k and did 30 mins weightlifting"` | `workout` | `WorkoutAgent` ➔ 0 Ambiguities ➔ SQLite Auto-Save | `success` 🎉 |
| `"Drank black coffee and ran 5 km"` | `both` | `NutritionAgent` & `WorkoutAgent` ➔ Dual Auto-Save | `success` 🎉 |
| `""` *(Empty audio)* | `unknown` | Sanitization Intercept ➔ Guidance Tip | `success` 💡 |
