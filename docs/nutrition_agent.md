# 🍛 NutritionAgent — Architectural Specification & Technical Guide

`backend/app/agents/nutrition_agent.py`

---

## 📌 Executive Summary

The **`NutritionAgent`** is Calora AI's clinical nutrition intelligence engine. It extracts dishes, raw ingredients, portion quantities, and macronutrients from natural spoken voice transcripts or typed meals.

It features:
1. **Multi-Meal Segmentation**: Automatically splits single compound transcripts describing multiple meals (e.g. *"For breakfast I had oats, for lunch 2 rotis with dal, and for dinner paneer bhurji"*) into separate structured database records.
2. **Indian Cuisine Intelligence (ICMR-NIN / IFCT)**: Built-in awareness of traditional Indian cooking preparations, domestic units (`katoris`, `phulkas`, `ladles`), cooking fats (ghee, mustard oil, butter), and composite gravies.
3. **Personalized Habit Injection**: Reads `user_memory` (e.g. *"drinks coffee without sugar"*, *"roti without ghee"*) to adjust base calculations without asking redundant questions.
4. **Inline Ambiguity Detection**: Flags high-impact culinary omissions ($>15\%$ calorie variance) and prepares 1-tap clarification pills.
5. **Deterministic Offline Fallback**: Guarantees zero downtime via hardcoded ICMR-NIN baseline nutritional parsing if cloud LLMs are unreachable.

---

## 🏛️ Internal Architecture & Data Flow Diagram

```mermaid
flowchart TD
    %% Styling Classes
    classDef inputNode fill:#065f46,stroke:#34d399,stroke-width:2.5px,color:#ffffff,font-weight:bold;
    classDef contextNode fill:#1e1b4b,stroke:#818cf8,stroke-width:1.5px,color:#ffffff;
    classDef llmNode fill:#2e1065,stroke:#a855f7,stroke-width:2px,color:#ffffff;
    classDef parserNode fill:#0f172a,stroke:#38bdf8,stroke-width:1.5px,color:#ffffff;
    classDef decision fill:#78350f,stroke:#fbbf24,stroke-width:2px,color:#ffffff;
    classDef outputMeal fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#ffffff;
    classDef outputClarify fill:#831843,stroke:#f43f5e,stroke-width:2px,color:#ffffff;
    classDef fallbackNode fill:#1e293b,stroke:#94a3b8,stroke-width:1.5px,color:#ffffff;

    %% Entry
    RAW["📥 Input: Spoken Meal Transcript (e.g. '2 rotis with dal tadka')"]:::inputNode

    %% Context Preparation
    subgraph CONTEXT ["🧠 Context & Profile Augmentation"]
        DIET["User Dietary Preference<br/>• Vegetarian / Non-Vegetarian / Vegan / Jain"]:::contextNode
        MEM["Learned Habit Memory (from user_memory)<br/>• 'roti_ghee = Dry', 'chai_sugar = No Sugar'"]:::contextNode
        PROMPT_BUILD["Structured Nutrition Prompt Builder<br/>• Enforces ICMR-NIN standards & Domestic Units"]:::contextNode
    end

    %% LLM Execution Cascade
    subgraph CASCADE ["☁️ Google Gemini Model Cascade Pool"]
        GEMINI["Gemini 3.7 / 3.6 / 3.5 / 2.0 Flash<br/>(Structured JSON Extraction)"]:::llmNode
    end

    %% JSON Output Validation
    VALIDATE{"LLM JSON<br/>Generated Successfully?"}:::decision

    %% Success Parsing Branch
    subgraph PARSER ["⚡ Multi-Meal & Macro Parser"]
        SEGMENT["Multi-Meal Splitter<br/>(Segments breakfast / lunch / dinner / snacks)"]:::parserNode
        MACRO_MATH["Macro & Energy Aggregator<br/>• Calories = 4*P + 4*C + 9*F<br/>• Fiber & Micronutrient tracking"]:::parserNode
        AMBIGUITY["Ambiguity Evaluator<br/>(Filters >15% Calorie Delta Questions)"]:::parserNode
    end

    %% Fallback Branch
    subgraph FALLBACK ["🛡️ Deterministic Offline Fallback Engine"]
        OFFLINE["ICMR-NIN Hardcoded Lexicon Engine<br/>• Roti (85 kcal) • Dal (145 kcal) • Oats (230 kcal)<br/>• Chai (65 kcal) • Paneer (280 kcal)"]:::fallbackNode
    end

    %% Outputs
    OUT_MEALS["🍛 List[MealLogCreate]<br/>• meal_title, meal_type, items[], calories, protein, carbs, fat, fiber"]:::outputMeal
    OUT_CLARIFY["🔍 List[ClarificationItem]<br/>• question, assumed_value, options[]"]:::outputClarify

    %% Connections
    RAW --> PROMPT_BUILD
    DIET & MEM --> PROMPT_BUILD
    PROMPT_BUILD --> GEMINI
    GEMINI --> VALIDATE

    VALIDATE -->|YES| SEGMENT
    SEGMENT --> MACRO_MATH
    MACRO_MATH --> AMBIGUITY
    AMBIGUITY --> OUT_MEALS & OUT_CLARIFY

    VALIDATE -->|NO / Offline| OFFLINE
    OFFLINE --> OUT_MEALS & OUT_CLARIFY

    %% Color-coded Links
    linkStyle 0,1,2,3 stroke:#38BDF8,stroke-width:2px;
    linkStyle 4,5,6,7 stroke:#F59E0B,stroke-width:2px;
    linkStyle 8,9,10,11 stroke:#34D399,stroke-width:2px;
    linkStyle 12,13 stroke:#F43F5E,stroke-width:2px;
```

---

## 🔍 Exhaustive Feature Breakdown

### 1. Multi-Meal Temporal Segmentation
Users often speak compound voice logs covering their entire day in a single breath:
> *"For breakfast I had a bowl of oats, for lunch 2 rotis with dal tadka, and for dinner 200g paneer bhurji."*

`NutritionAgent` automatically segments this into **3 discrete database objects**:
* **Meal 1 (`breakfast`)**: *"Oats Bowl"* — 230 kcal (9.5g P, 39g C, 4.2g F)
* **Meal 2 (`lunch`)**: *"2 Rotis with Dal Tadka"* — 315 kcal (13g P, 49.5g C, 7.8g F)
* **Meal 3 (`dinner`)**: *"Paneer Bhurji"* — 340 kcal (22g P, 8g C, 24g F)

---

### 2. Indian Food Composition & Domestic Unit Normalization

The agent maps domestic, colloquial Indian cooking terms into verified standard weights according to the **ICMR - National Institute of Nutrition (NIN)** tables:

| Domestic Unit | Standard Portion Weight | Grams / Volume | Typical Base Dish & Energy |
| :--- | :--- | :---: | :--- |
| **`1 Phulka / Roti (Dry)`** | 1 Standard Hand-rolled Roti | $35\text{g}$ dough | $85\text{ kcal}$ ($2.4\text{g P}, 15.0\text{g C}, 1.8\text{g F}$) |
| **`1 Phulka with Ghee`** | 1 Roti + $0.5\text{ tsp}$ Ghee | $40\text{g}$ total | $105\text{ kcal}$ ($2.4\text{g P}, 15.0\text{g C}, 4.1\text{g F}$) |
| **`1 Paratha (Layered)`** | 1 Medium Pan-fried Paratha | $60\text{g}$ | $180\text{ kcal}$ ($3.5\text{g P}, 24.0\text{g C}, 7.5\text{g F}$) |
| **`1 Katori Dal`** | Standard Indian Steel Bowl | $150\text{g}$ ($150\text{ml}$) | $145\text{ kcal}$ ($8.2\text{g P}, 19.5\text{g C}, 4.2\text{g F}$) |
| **`1 Katori White Rice`** | 1 Standard Cooked Bowl | $150\text{g}$ cooked | $195\text{ kcal}$ ($3.8\text{g P}, 43.0\text{g C}, 0.5\text{g F}$) |
| **`1 Ladle Sambar`** | 1 Deep Serving Ladle | $120\text{ml}$ | $85\text{ kcal}$ ($3.5\text{g P}, 12.0\text{g C}, 2.5\text{g F}$) |
| **`1 Cup Masala Chai`** | Tea with Whole Milk & 1 tsp Sugar | $150\text{ml}$ | $65\text{ kcal}$ ($2.0\text{g P}, 8.5\text{g C}, 2.8\text{g F}$) |
| **`1 Glass Chaas / Buttermilk`** | Spiced Diluted Curd | $200\text{ml}$ | $45\text{ kcal}$ ($2.2\text{g P}, 3.8\text{g C}, 2.0\text{g F}$) |
| **`1 Bowl Paneer Sabzi`** | Paneer in Onion-Tomato Gravy | $150\text{g}$ | $280\text{ kcal}$ ($18.0\text{g P}, 8.0\text{g C}, 20.0\text{g F}$) |
| **`1 Plate Biryani`** | Medium Restaurant Serving | $350\text{g}$ | $520\text{ kcal}$ ($24.0\text{g P}, 58.0\text{g C}, 20.0\text{g F}$) |

---

### 3. Macronutrient Verification Formula

Every detected item's caloric value is mathematically grounded in its macronutrient constituents:

$$\text{Energy (kcal)} = (4 \times \text{Protein}_{\text{g}}) + (4 \times \text{Carbs}_{\text{g}}) + (9 \times \text{Fat}_{\text{g}})$$

All meals also track dietary fiber ($\text{Fiber}_{\text{g}}$) to give accurate net carb measurements.

---

### 4. Inline Ambiguity Detection (>15% Delta Rules)

The agent constantly scans for **high-impact hidden preparation variables**:
* **Cooking Fats**: *"Did you add ghee on top of your rotis or cook them dry?"* ($\sim 25\text{ kcal}$ per roti)
* **Added Sugars in Beverages**: *"Did your chai/coffee contain sugar or sweetener?"* ($\sim 25\text{ kcal}$ per tsp)
* **Restaurant vs Home Gravy**: *"Was the dal homestyle tadka or restaurant butter dal makhani?"* ($\sim 120\text{ kcal}$ delta)
* **Milk Type**: *"Was the latte made with whole cow milk, skimmed milk, or almond milk?"* ($\sim 60\text{ kcal}$ delta)

If any ambiguity can alter the meal's total calories by **$>15\%$**, `NutritionAgent` emits a structured `ClarificationItem` containing **3–4 one-tap pills**.

---

### 5. Memory & Habit Integration

Before prompting the user with a question, `NutritionAgent` checks `user_memory`.
* If `user_memory` contains `"roti_ghee = Dry"`, it automatically logs dry rotis ($85\text{ kcal}$) without asking.
* If `user_memory` contains `"chai_sugar = No Sugar"`, it logs sugarfree chai ($40\text{ kcal}$) seamlessly.

---

### 6. Deterministic Offline Fallback Engine

If the user's internet is offline or Gemini API rate limits are exceeded, `NutritionAgent` seamlessly switches to its **internal offline regex & rule engine**:
* Detects meals (`breakfast`, `lunch`, `dinner`, `snack`).
* Extracts dishes (`roti`, `dal`, `paneer`, `oats`, `coffee`, `tea`, `eggs`).
* Computes baseline ICMR-NIN macros.
* Ensures the user **never experiences a crashed log or failed request**.

---

## 🧪 Sample Ingestion Benchmarks

| Voice Input Transcript | Detected Items & Units | Calculated Macros | Clarification Triggered |
| :--- | :--- | :--- | :---: |
| `"2 rotis with dal tadka"` | • 2 Phulkas ($70\text{g}$)<br/>• 1 Katori Dal ($150\text{g}$) | **$315\text{ kcal}$**<br/>• $13.0\text{g P}$ • $49.5\text{g C}$ • $7.8\text{g F}$ | None (Standard Default) |
| `"A cup of coffee and 2 aloo parathas"` | • 1 Cup Coffee ($150\text{ml}$)<br/>• 2 Aloo Parathas ($140\text{g}$) | **$435\text{ kcal}$**<br/>• $9.5\text{g P}$ • $57.0\text{g C}$ • $18.2\text{g F}$ | `coffee_type` (Milk & Sugar check) |
| `"For breakfast 2 boiled eggs, for lunch rice and sambar"` | **Meal 1 (Breakfast)**: 2 Eggs ($100\text{g}$)<br/>**Meal 2 (Lunch)**: Rice + Sambar | **M1**: $140\text{ kcal}$ ($12\text{g P}$)<br/>**M2**: $280\text{ kcal}$ ($7.3\text{g P}$) | None (Auto-Segmented) |
| `"1 scoop of whey protein in 250ml milk"` | • 1 Scoop Whey ($30\text{g}$)<br/>• 1 Glass Whole Milk ($250\text{ml}$) | **$275\text{ kcal}$**<br/>• $32.0\text{g P}$ • $14.5\text{g C}$ • $8.5\text{g F}$ | None |
