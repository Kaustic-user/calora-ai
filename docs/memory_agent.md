# 🧠 MemoryAgent — Architectural Specification & Technical Guide

`backend/app/agents/memory_agent.py`

---

## 📌 Executive Summary

The **`MemoryAgent`** is Calora AI's persistent context and lifelong learning engine. It manages personalized user preferences, learned culinary habits, dietary restrictions, and workout defaults, eliminating repetitive clarification questions and powering hyper-personalized recommendations.

It features:
1. **Categorized Memory Architecture**: Segregates context into 3 distinct operational buckets: `habits` (e.g., *"roti without ghee"*), `restrictions` (e.g., *"lactose intolerant"*), and `favorites` (e.g., *"paneer bhurji"*).
2. **Upsert Habit Persistence**: Seamlessly updates existing habit keys or inserts new memories into SQLite (`user_memory` table) with zero duplication.
3. **Omnipresent Agent Injection**: Feeds structured habit context to `MasterOrchestratorAgent`, `NutritionAgent`, `WorkoutAgent`, and `RecommenderAgent` on every turn.
4. **User Control & Transparency**: Connects directly to `GET /api/profile/memories` and `DELETE /api/profile/memories/{id}`, enabling users to inspect and delete learned memories at any time via the UI.

---

## 🏛️ Internal Architecture & Memory Lifecycle Diagram

```mermaid
flowchart TD
    %% Styling Classes
    classDef inputNode fill:#065f46,stroke:#34d399,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef memoryNode fill:#0f172a,stroke:#38bdf8,stroke-width:1.5px,color:#ffffff;
    classDef dbNode fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef agentNode fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#ffffff;
    classDef uiNode fill:#2e1065,stroke:#a855f7,stroke-width:1.5px,color:#ffffff;

    %% Ingestion Sources
    subgraph INGESTION ["📥 Memory Ingestion Channels"]
        CLARIFY_INPUT["Clarification Resolution<br/>• User taps 'Without Ghee'<br/>• User speaks 'No Sugar'"]:::inputNode
        SETTINGS_INPUT["Profile Settings Modal<br/>• Dietary preference (Vegan, Jain)<br/>• Target calorie & macro goals"]:::uiNode
    end

    %% Memory Agent Core
    subgraph MEMORY_CORE ["🧠 MemoryAgent Core (memory_agent.py)"]
        UPSERT["save_habit(db, key, value, category)<br/>• Checks existing key<br/>• Updates value or inserts new row"]:::memoryNode
        RETRIEVE["get_user_context(db)<br/>• Aggregates habits, restrictions, favorites"]:::memoryNode
    end

    %% Persistence
    subgraph STORAGE ["💾 SQLite Database (calora.db)"]
        TABLE[("user_memory Table<br/>• id (PK)<br/>• category (habit / restriction / favorite)<br/>• key (e.g. 'coffee_sugar')<br/>• value (e.g. 'No Sugar')<br/>• created_at (Timestamp)")]:::dbNode
    end

    %% Downstream Consumers
    subgraph CONSUMERS ["🤖 Downstream Agent Context Injection"]
        ORCH["👑 Master Orchestrator<br/>(Context Loader)"]:::agentNode
        NUTRI["🍛 NutritionAgent<br/>(Auto-applies dry roti / sugarfree chai)"]:::agentNode
        WORKOUT["🏋️ WorkoutAgent<br/>(Applies default gym intensity)"]:::agentNode
        REC["🎯 RecommenderAgent<br/>(Filters allergens & favors preferred foods)"]:::agentNode
    end

    %% User Visibility
    subgraph USER_UI ["🖥️ Frontend Transparency"]
        MODAL["UserProfileModal.jsx<br/>• View all learned habits<br/>• 1-Click Delete Memory Button"]:::uiNode
    end

    %% Flow Connections
    CLARIFY_INPUT & SETTINGS_INPUT --> UPSERT
    UPSERT --> TABLE
    TABLE <--> RETRIEVE

    RETRIEVE --> ORCH
    ORCH --> NUTRI & WORKOUT
    RETRIEVE --> REC

    TABLE <--> MODAL

    %% Color-coded Links
    linkStyle 0,1 stroke:#38BDF8,stroke-width:2px;
    linkStyle 2,3 stroke:#10B981,stroke-width:2px;
    linkStyle 4,5,6,7 stroke:#F59E0B,stroke-width:2px;
    linkStyle 8 stroke:#A855F7,stroke-width:2px;
```

---

## 🔍 Exhaustive Feature Breakdown

### 1. Structured Tri-Category Context Engine

`MemoryAgent.get_user_context()` aggregates memories into three operational domains:

```python
{
    "habits": [
        "coffee_sugar: No Sugar (Black)",
        "roti_ghee: Dry (No Ghee)",
        "tea_milk: Skimmed Milk"
    ],
    "restrictions": [
        "diet: Lactose Intolerant",
        "allergy: Peanuts"
    ],
    "favorites": [
        "breakfast: Oats with Chia Seeds",
        "dinner: Soya Chunks Bhurji"
    ]
}
```

---

### 2. Idempotent Upsert Habit Engine

The `save_habit()` method prevents memory bloat by updating existing keys rather than creating redundant rows:

```python
def save_habit(self, db: Session, key: str, value: str, category: str = "habit"):
    existing = db.query(UserMemory).filter(UserMemory.key == key).first()
    if existing:
        existing.value = value  # In-place update
    else:
        new_mem = UserMemory(category=category, key=key, value=value)
        db.add(new_mem)
    db.commit()
```

* If a user previously logged *"1 tsp sugar in tea"* and later clicks *"No Sugar"*, `save_habit` smoothly overwrites the record without creating duplicate entries.

---

### 3. Impact on Downstream Agents

| Consuming Agent | How `user_memory` is Utilized |
| :--- | :--- |
| **`NutritionAgent`** | Automatically factors in dry rotis ($85\text{ kcal}$), sugarfree coffee ($5\text{ kcal}$), or specific cooking oils without triggering redundant clarification banners. |
| **`WorkoutAgent`** | Defaults to the user's preferred exercise duration or standard intensity (e.g. 45 min strength session) if unspecified. |
| **`RecommenderAgent`** | Strictly excludes restricted foods (e.g. gluten, lactose) and synthesizes recipes featuring user favorite proteins (e.g. tofu, eggs, paneer). |
| **`MasterOrchestrator`** | Pre-populates the prompt context envelope before dispatching to sub-agents. |

---

### 4. Complete User Privacy & Manual Memory Control

Unlike opaque AI memory systems, Calora AI gives users **100% control over their stored memory**:
* **Inspection**: Open the Profile modal in the dashboard to review all active memory cards.
* **Granular Deletion**: Users can click the trash icon next to any learned habit (e.g., delete `coffee_sugar`) via `DELETE /api/profile/memories/{id}`, instantly resetting that specific preference.

---

## 🧪 Sample Ingestion Benchmarks

| Trigger Event | Key Stored | Value Stored | Category | Downstream Effect |
| :--- | :--- | :--- | :---: | :--- |
| User answers *"No Sugar"* on Coffee | `coffee_type` | `Black (No Milk, No Sugar)` | `habit` | Future coffee logs default to $5\text{ kcal}$ |
| User answers *"Without Ghee"* on Roti | `roti_ghee` | `Dry (No Ghee)` | `habit` | Future rotis default to $85\text{ kcal}$ ($0\text{g}$ added fat) |
| User sets *"Vegetarian"* in Profile | `dietary_pref` | `Vegetarian` | `restriction` | Recommender suppresses non-veg recipes |
| User logs *"50 min gym session"* | `gym_duration` | `50 Minutes` | `habit` | Workout agent assumes 50 min baseline |
