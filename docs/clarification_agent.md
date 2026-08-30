# 🔍 ClarificationAgent — Architectural Specification & Technical Guide

`backend/app/agents/clarification_agent.py`

---

## 📌 Executive Summary

The **`ClarificationAgent`** is Calora AI's **Pre-Log Protection Gatekeeper**. It protects calorie tracking accuracy by analyzing what the user said versus what was parsed, detecting omitted high-impact cooking variables, and prompting for fast clarification before any record is committed to the database.

It features:
1. **The 15% Calorie Delta Rule**: Suppresses trivial questions (e.g., salt, spices, water brand) while strictly flagging variables that alter calories by $>15\%$ (e.g., cooking oils, ghee, added sugars, dressings, cuts of meat, workout durations).
2. **Transparent Default Assumptions**: Clearly communicates the assumed standard (e.g., *"Assumed 1 tsp Sugar (~25 kcal)"*), so the user knows what baseline was used.
3. **1-Tap & Voice Resolution Payloads**: Synthesizes 3–4 clickable option pills for instant resolution, alongside a voice mic input for spoken answers (*"Without ghee"*).
4. **Permanent Learning Interlock**: Coordinates with `MemoryAgent` so that once a user clarifies a preference, it is saved into `user_memory` and never asked again.
5. **Atomic Re-Calculation & Persistence**: Re-invokes `NutritionAgent` or `WorkoutAgent` with the confirmed choice, writing to SQLite **exactly once**.

---

## 🏛️ Internal Architecture & Pre-Log Protection Flow Diagram

```mermaid
flowchart TD
    %% Styling Classes
    classDef inputNode fill:#065f46,stroke:#34d399,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef contextNode fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#ffffff;
    classDef llmNode fill:#2e1065,stroke:#a855f7,stroke-width:2px,color:#ffffff;
    classDef decision fill:#78350f,stroke:#fbbf24,stroke-width:2px,color:#ffffff;
    classDef uiNode fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#ffffff;
    classDef memoryNode fill:#0f172a,stroke:#38bdf8,stroke-width:1.5px,color:#ffffff;
    classDef dbNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;

    %% Entry
    INPUT["📥 Input: Transcript + Parsed Meal/Workout + Known Habits"]:::inputNode

    %% Delta Analysis
    subgraph ANALYSIS ["🔬 Calorie Delta & Ambiguity Analysis"]
        SCAN["Ambiguity Scanner<br/>• Cooking Oils & Ghee Deliberation<br/>• Added Sugar in Beverages<br/>• Creamy vs Clear Dressings<br/>• Duration & Intensity Omissions"]:::contextNode
        DELTA_CHECK{"Calculated Delta > 15%?"}:::decision
    end

    %% Synthesis & LLM
    subgraph SYNTHESIS ["☁️ Gemini Ambiguity Synthesis"]
        LLM["Gemini 3.7 / 3.6 Flash Structured JSON<br/>• id, question, assumed_value, options[]"]:::llmNode
    end

    %% Pre-Log Decision Gate
    GATE{"🛡️ Pre-Log Decision Gate"}:::decision

    %% Path A: Clarification Loop
    subgraph RESOLUTION_LOOP ["⚡ 1-Tap & Voice Resolution Loop"]
        BANNER["ClarificationBanner (React UI)<br/>• 1-Tap Option Pills<br/>• 'Speak Answer' Voice Mic"]:::uiNode
        USER_ACTION["User Taps Option / Speaks Answer<br/>(e.g. 'No Sugar', 'Without Ghee')"]:::inputNode
        API["POST /api/voice/resolve-clarification"]:::contextNode
        LEARN["MemoryAgent.save_habit()<br/>(Persists habit to user_memory)"]:::memoryNode
        RECALC["Re-Invoke Nutrition/Workout Agent<br/>(Calculates verified exact macros)"]:::contextNode
    end

    %% Path B: Direct Save
    SQLITE[("💾 SQLite Database (calora.db)<br/>• Persists finalized record exactly once")]:::dbNode

    %% Flow Connections
    INPUT --> SCAN
    SCAN --> DELTA_CHECK
    DELTA_CHECK -->|YES| LLM
    DELTA_CHECK -->|NO (Explicit/Minor)| GATE

    LLM --> GATE
    GATE -->|Ambiguities Found: Hold Pending| BANNER
    GATE -->|0 Ambiguities: Auto-Save| SQLITE

    BANNER --> USER_ACTION
    USER_ACTION --> API
    API --> LEARN
    LEARN --> RECALC
    RECALC --> SQLITE

    %% Color-coded Links
    linkStyle 0,1,2,3 stroke:#38BDF8,stroke-width:2px;
    linkStyle 4,5 stroke:#F59E0B,stroke-width:2px;
    linkStyle 6,7,8,9,10 stroke:#EA580C,stroke-width:2px;
    linkStyle 11 stroke:#10B981,stroke-width:2px;
```

---

## 🔍 Exhaustive Feature Breakdown

### 1. The 15% Calorie Delta Rule
To prevent user cognitive fatigue while ensuring clinical-grade accuracy, `ClarificationAgent` uses a strict **$\pm 15\%$ caloric significance threshold**:

$$\text{Trigger Clarification} \iff \frac{|\text{Calorie}_{\text{variant}} - \text{Calorie}_{\text{assumed}}|}{\text{Calorie}_{\text{total}}} \ge 0.15$$

#### Examples of Triggered Ambiguities ($>15\%$ Impact):
* ☕ **Chai / Coffee Added Sugar**: Whole milk + 2 tsp sugar ($85\text{ kcal}$) vs Black coffee ($5\text{ kcal}$) $\rightarrow$ **$1600\%$ delta!**
* 🫓 **Roti Ghee vs Dry**: 2 Phulkas with ghee ($210\text{ kcal}$) vs Dry phulkas ($170\text{ kcal}$) $\rightarrow$ **$24\%$ delta.**
* 🥗 **Salad Dressing**: Grilled chicken salad with ranch dressing ($450\text{ kcal}$) vs Olive oil & lemon ($220\text{ kcal}$) $\rightarrow$ **$104\%$ delta.**
* 🏃 **Workout Duration**: 15 min run ($170\text{ kcal}$) vs 45 min run ($510\text{ kcal}$) $\rightarrow$ **$200\%$ delta.**

#### Examples of Suppressed Questions ($<15\%$ Impact):
* 🧂 Pinch of salt or cumin seasoning.
* 🌿 Fresh coriander / mint garnish.
* 💧 Exact water volume consumed with food.

---

### 2. Multi-Modal Clarification Payload Structure

When an ambiguity is flagged, `ClarificationAgent` generates a complete `ClarificationItem` payload:

```json
{
  "id": "coffee_sugar_check",
  "question": "Did your coffee have added sugar?",
  "assumed_value": "1 tsp Sugar (~25 kcal)",
  "options": [
    "1 tsp Sugar (Default)",
    "No Sugar (Black)",
    "2+ tsp Sugar",
    "Jaggery / Honey"
  ]
}
```

* **`id`**: Unique string identifier mapped directly to habit storage keys in `UserMemory`.
* **`question`**: Human-friendly conversational prompt displayed in the banner.
* **`assumed_value`**: Transparent disclosure of the default mathematical assumption.
* **`options`**: Array of 3–4 instant one-tap buttons.

---

### 3. Voice & Multi-Modal Answer Resolution

Users are never forced to click:
1. **1-Tap Click**: Tap any button pill (e.g. `[No Sugar]`).
2. **Spoken Voice Answer**: Tap the mini-microphone on the clarification card and speak naturally (*"I drink it black without any sugar"*).
   - `POST /api/voice/resolve-clarification-audio` transcribes the voice audio and resolves the question seamlessly.

---

### 4. Habit Learning & Lifelong Memory Integration

When a clarification is resolved:
1. `voice.py` invokes `MemoryAgent.save_habit(key=item.id, value=chosen_option)`.
2. The user's preference is saved in the SQLite `user_memory` table (e.g., `coffee_sugar = No Sugar`).
3. Future voice logs (e.g., *"Had a cup of coffee"*) automatically use the learned habit without asking again!

---

### 5. Atomic Re-Calculation & Single-Write Guarantee

* When ambiguities exist, the initial log is **held in a transient pending state** in frontend memory.
* Once the user confirms their choices, `voice.py` re-invokes `NutritionAgent.parse_meal()` or `WorkoutAgent.parse_workout()` with the explicit preference appended (e.g. `"2 rotis (Prepared with: Without Ghee)"`).
* The final, verified record is committed to SQLite **exactly once**, preventing duplicate rows.

---

## 🧪 Sample Ingestion Benchmarks

| Spoken Transcript | Ambiguity Detected | Clarification Question | 1-Tap Quick Options |
| :--- | :--- | :--- | :--- |
| `"I had 2 parathas and a cup of chai"` | `paratha_fat`, `tea_sugar` | 1. *"Were your parathas made with ghee/butter or dry?"*<br/>2. *"Did your chai have added sugar?"* | • `[With Ghee/Butter (Default)]`, `[Dry/No Oil]`<br/>• `[1 tsp Sugar (Default)]`, `[No Sugar]`, `[Jaggery]` |
| `"Went for a run this morning"` | `workout_duration` | *"How long did you run for?"* | • `[15 Mins]`, `[30 Mins (Default)]`, `[45 Mins]`, `[60 Mins]` |
| `"Ate 150g boiled chicken breast with white rice"` | **None** | *None (Completely Explicit)* | Direct Auto-Save ✅ |
| `"Drank black coffee and ate 2 dry rotis"` | **None** | *None (Explicitly Specified)* | Direct Auto-Save ✅ |
