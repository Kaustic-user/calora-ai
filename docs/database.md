# 🗄️ Database Architecture & Schema Specification

This document provides a comprehensive technical reference for the **Calora AI** database layer, covering its engine architecture, schema definitions, classification (OLTP), entity relationships ($1:1$, $1:N$), and referential integrity model.

---

## 1. Executive Summary & Engine Architecture

Calora AI uses **SQLite 3** managed through **SQLAlchemy 2.0 ORM** in Python (FastAPI). It employs a **Hybrid Relational + JSON Document** model designed specifically for low-latency agentic AI workflows.

```
   ┌────────────────────────────────────────────────────────┐
   │                  FastAPI Backend                       │
   │  (Pydantic Schemas  ↔  SQLAlchemy Declarative Models)  │
   └───────────────────────────┬────────────────────────────┘
                               │
                [Engine: sqlite:///backend/calora.db]
                               │
   ┌───────────────────────────┴────────────────────────────┐
   │                     calora.db                          │
   │   ┌─────────────────┐        ┌─────────────────┐       │
   │   │  user_profiles  │        │    meal_logs    │       │
   │   └─────────────────┘        └─────────────────┘       │
   │   ┌─────────────────┐        ┌─────────────────┐       │
   │   │  workout_logs   │        │   user_memory   │       │
   │   └─────────────────┘        └─────────────────┘       │
   └────────────────────────────────────────────────────────┘
```

* **Storage Location**: Local SQLite file at `backend/calora.db`.
* **Abstraction Layer**: **SQLAlchemy 2.0** with `declarative_base()`.
* **Session Lifecycle**: FastAPI dependency injection (`get_db()`) providing scoped sessions per request.
* **Concurrency Configuration**: `check_same_thread: False` allows FastAPI's asynchronous event loop to safely share connection handles across worker threads.
* **ACID Guarantees**: Atomic transactions prevent database corruption even on abrupt application shutdown.

---

## 2. Database Classification: OLTP vs. OLAP

### Calora AI is an **OLTP (Online Transaction Processing)** Database System.

| Dimension | **OLTP (Calora AI / SQLite)** | **OLAP (DuckDB, ClickHouse, BigQuery)** |
| :--- | :--- | :--- |
| **Primary Goal** | Real-time, day-to-day transactional logging | Massive batch data processing and business analytics |
| **Data Layout** | **Row-Oriented** (stores complete records sequentially) | **Column-Oriented** (stores column blocks sequentially) |
| **Operations** | Frequent `INSERT`, `UPDATE`, `DELETE`, and indexed `SELECT` by Date/ID | Heavy `SUM`, `AVG`, `GROUP BY` across millions of rows |
| **Latency** | **Sub-millisecond to 2ms (In-memory/disk)** | Seconds to minutes (for gigabytes to terabytes) |
| **Access Pattern** | Single meal logs, workout entries, habit updates | 5-year macro trend forecasting across entire userbases |

### Why Row-Oriented OLTP is Optimal for Calora AI:
1. **Instant Write Throughput**: When the voice orchestrator parses a meal, it writes one complete row with all nutritional macros in a single disk I/O cycle (< 1ms).
2. **Fast Date Filtering**: Lookups for the active date (`SELECT * FROM meal_logs WHERE log_date = :date`) execute in sub-millisecond time.
3. **Local Analytics**: For personal datasets (thousands of rows over years), SQLite executes 7-day rolling deficit aggregations in **< 1ms**, eliminating the need for a separate analytical warehouse.

---

## 3. Entity Relationships & Cardinality ($1:1$, $1:N$, $M:N$)

Calora AI models its entities using **$1:1$ (One-to-One)** and **$1:N$ (One-to-Many)** relationships, while avoiding complex **$M:N$ (Many-to-Many)** joins through **Embedded Document Containment**.

```mermaid
erDiagram
    USER_PROFILE ||--o{ MEAL_LOG : "1:N (Logs Many Meals)"
    USER_PROFILE ||--o{ WORKOUT_LOG : "1:N (Logs Many Workouts)"
    USER_PROFILE ||--o{ USER_MEMORY : "1:N (Learns Many Habits)"
    MEAL_LOG ||--|{ MEAL_ITEMS : "1:N (Embedded JSON Array)"

    USER_PROFILE {
        int id PK
        string name
        int calorie_target
        float protein_target
        float carbs_target
        float fat_target
        float weight_kg
        float height_cm
        int age
        string gender
        string activity_level
        int target_deficit_kcal
        string dietary_preference
        string allergies
    }

    MEAL_LOG {
        int id PK
        date log_date "Indexed"
        string meal_type
        string meal_title
        text raw_transcript
        text items_json "Structured JSON"
        float calories
        float protein_g
        float carbs_g
        float fat_g
        float fiber_g
        text assumptions_json
        boolean is_confirmed
    }

    WORKOUT_LOG {
        int id PK
        date log_date "Indexed"
        string exercise_name
        string workout_category
        int duration_minutes
        string intensity
        float calories_burned
        string muscle_groups
        text notes
    }

    USER_MEMORY {
        int id PK
        string category "Indexed"
        string key "Indexed"
        text value
    }
```

---

### Cardinality Breakdown:

#### 1. **$1:1$ (One-to-One)**: User $\leftrightarrow$ User Profile
* Exactly **1 user** possesses **1 active biometric and metabolic profile** (`user_profiles.id = 1`).
* Captures height, weight, age, biological sex, activity level, and target calorie deficit.

#### 2. **$1:N$ (One-to-Many)**: User $\rightarrow$ Logs & Memory
* **User $\rightarrow$ Meal Logs ($1:N$)**: 1 user logs many meals over time.
* **User $\rightarrow$ Workout Logs ($1:N$)**: 1 user logs many workouts over time.
* **User $\rightarrow$ User Memory ($1:N$)**: 1 user accumulates many long-term learned preferences (e.g. coffee sweeteners, cooking fats, default portions).
* **Calendar Date $\rightarrow$ Logs ($1:N$)**: 1 calendar date groups multiple meal events (breakfast, lunch, snacks, dinner) and exercise sessions.

#### 3. **Why No $M:N$ (Many-to-Many)? — Embedded JSON Document Pattern**
In classic relational databases, recipes are modeled as $M:N$ (Many Meals $\leftrightarrow$ Many Ingredients via a junction table `meal_ingredients`).

**Calora AI's Approach**:
* Each meal embeds its ingredient items directly in the `items_json` column as a structured JSON document.
* **Advantages**:
  * **Zero SQL Joins**: Reading a meal fetches all ingredient line-items in a single atomic select.
  * **Zero Orphan Records**: Updating or deleting a meal automatically updates or deletes all its ingredient items.
  * **Arbitrary Complexity**: Allows the AI agent to parse complex, custom home-cooked meals without rigid database migrations.

---

## 4. Complete Table Schemas

### Table 1: `user_profiles`
Stores physical attributes, lifestyle factors, and target macro goals.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT, INDEX` | Unique profile ID. |
| `name` | `VARCHAR(100)` | `DEFAULT 'Fitness Enthusiast'` | Display username. |
| `calorie_target` | `INTEGER` | `DEFAULT 2000` | Daily calorie budget target (kcal). |
| `protein_target` | `FLOAT` | `DEFAULT 120.0` | Daily protein goal (grams). |
| `carbs_target` | `FLOAT` | `DEFAULT 225.0` | Daily carbohydrate goal (grams). |
| `fat_target` | `FLOAT` | `DEFAULT 65.0` | Daily healthy fats goal (grams). |
| `fiber_target` | `FLOAT` | `DEFAULT 30.0` | Daily dietary fiber goal (grams). |
| `water_target_liters` | `FLOAT` | `DEFAULT 3.0` | Daily hydration target (liters). |
| `weight_kg` | `FLOAT` | `DEFAULT 70.0` | Current body weight in kg. |
| `height_cm` | `FLOAT` | `DEFAULT 175.0` | Height in centimeters (for BMR calculation). |
| `age` | `INTEGER` | `DEFAULT 25` | Age in years (for metabolic rate calculation). |
| `gender` | `VARCHAR(20)` | `DEFAULT 'male'` | Biological sex (`'male'` / `'female'`). |
| `activity_level` | `VARCHAR(30)` | `DEFAULT 'sedentary'` | Activity factor (`sedentary`, `lightly_active`, `moderately_active`, `very_active`, `extra_active`). |
| `target_deficit_kcal` | `INTEGER` | `DEFAULT 500` | Target daily deficit for weight loss goals. |
| `dietary_preference` | `VARCHAR(50)` | `DEFAULT 'vegetarian'` | Diet rule (`vegetarian`, `vegan`, `eggetarian`, `non_vegetarian`, `jain`). |
| `allergies` | `VARCHAR(255)` | `DEFAULT ''` | Allergy restrictions. |
| `created_at` | `DATETIME` | `DEFAULT datetime.utcnow` | Profile creation timestamp. |

---

### Table 2: `meal_logs`
Stores recorded meals, calculated macronutrients, and ingredient breakdowns.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT, INDEX` | Unique meal identifier. |
| `log_date` | `DATE` | `INDEX, DEFAULT date.today` | Date of the meal entry. |
| `meal_type` | `VARCHAR(50)` | `DEFAULT 'lunch'` | Category: `breakfast`, `lunch`, `dinner`, `snack`. |
| `meal_title` | `VARCHAR(200)` | `NOT NULL` | Synthesized title (e.g. *"Mexican Paneer Rice Bowl"*). |
| `raw_transcript` | `TEXT` | `NULLABLE` | Original spoken voice note or typed text. |
| `items_json` | `TEXT (JSON)` | `NOT NULL` | **JSON array of parsed food items & portions**. |
| `calories` | `FLOAT` | `DEFAULT 0.0` | Total meal energy (kcal). |
| `protein_g` | `FLOAT` | `DEFAULT 0.0` | Total meal protein ($g$). |
| `carbs_g` | `FLOAT` | `DEFAULT 0.0` | Total meal carbohydrates ($g$). |
| `fat_g` | `FLOAT` | `DEFAULT 0.0` | Total meal fats ($g$). |
| `fiber_g` | `FLOAT` | `DEFAULT 0.0` | Total meal fiber ($g$). |
| `assumptions_json` | `TEXT (JSON)` | `DEFAULT '[]'` | AI assumptions and clarification confirmations. |
| `is_confirmed` | `BOOLEAN` | `DEFAULT True` | True if confirmed/logged. |
| `created_at` | `DATETIME` | `DEFAULT datetime.utcnow` | Record insertion timestamp. |

#### Example `items_json` Structure:
```json
[
  {
    "name": "Paneer (Cottage Cheese)",
    "portion": "50g",
    "quantity": 50.0,
    "unit": "g",
    "calories": 160.0,
    "protein_g": 9.0,
    "carbs_g": 2.0,
    "fat_g": 13.0,
    "fiber_g": 0.0,
    "is_estimated": false,
    "source": "gemini_llm_intelligence"
  },
  {
    "name": "White Basmati Rice",
    "portion": "1 cup (cooked)",
    "quantity": 150.0,
    "unit": "g",
    "calories": 195.0,
    "protein_g": 4.0,
    "carbs_g": 42.0,
    "fat_g": 0.5,
    "fiber_g": 0.6,
    "is_estimated": false,
    "source": "gemini_llm_intelligence"
  }
]
```

---

### Table 3: `workout_logs`
Stores exercise sessions, duration, intensity, and calculated energy expenditure.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT, INDEX` | Unique workout ID. |
| `log_date` | `DATE` | `INDEX, DEFAULT date.today` | Date of the workout session. |
| `exercise_name` | `VARCHAR(150)` | `NOT NULL` | Workout name (e.g. *"Pull Day (Back & Biceps)"*). |
| `workout_category` | `VARCHAR(50)` | `DEFAULT 'strength'` | Category: `strength`, `cardio`, `yoga`, `hiit`, `sports`. |
| `duration_minutes` | `INTEGER` | `DEFAULT 30` | Active session duration in minutes. |
| `intensity` | `VARCHAR(30)` | `DEFAULT 'moderate'` | Intensity level: `low`, `moderate`, `high`. |
| `calories_burned` | `FLOAT` | `DEFAULT 0.0` | Energy expenditure ($\text{MET} \times \text{Weight(kg)} \times \text{Hours}$). |
| `muscle_groups` | `VARCHAR(150)` | `DEFAULT 'Full Body'` | Target muscle groups. |
| `notes` | `TEXT` | `NULLABLE` | Extra notes, sets/reps, or clarification confirmations. |
| `created_at` | `DATETIME` | `DEFAULT datetime.utcnow` | Record insertion timestamp. |

---

### Table 4: `user_memory`
Long-term memory store for the agentic intelligence pipeline. Automatically persists user habits resolved through clarifications.

| Column | Type | Constraints / Defaults | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY, AUTOINCREMENT, INDEX` | Unique memory ID. |
| `category` | `VARCHAR(50)` | `INDEX, DEFAULT 'habit'` | Category: `habit`, `favorite_food`, `restriction`, `correction`. |
| `key` | `VARCHAR(100)` | `INDEX, NOT NULL` | Memory key (e.g. `'coffee_sweetener'`, `'roti_cooking_fat'`). |
| `value` | `TEXT` | `NOT NULL` | Learned value (e.g. `'Black (No milk, no sugar)'`). |
| `created_at` | `DATETIME` | `DEFAULT datetime.utcnow` | Timestamp when habit was learned. |

---

## 5. Key Calculations & Queries

### 1. Mifflin-St Jeor BMR & Maintenance TDEE
Computed dynamically from `user_profiles`:
$$\text{BMR}_{\text{male}} = (10 \times \text{weight\_kg}) + (6.25 \times \text{height\_cm}) - (5 \times \text{age}) + 5$$
$$\text{BMR}_{\text{female}} = (10 \times \text{weight\_kg}) + (6.25 \times \text{height\_cm}) - (5 \times \text{age}) - 161$$
$$\text{Maintenance TDEE} = \text{BMR} \times \text{Activity Multiplier}$$

| Activity Level | Multiplier |
| :--- | :--- |
| `sedentary` | $\times 1.20$ |
| `lightly_active` | $\times 1.375$ |
| `moderately_active` | $\times 1.55$ |
| `very_active` | $\times 1.725$ |
| `extra_active` | $\times 1.90$ |

### 2. Standardized Daily Deficit (Approach A)
Synchronized across the dashboard and 7-day trend graphs:
$$\text{Daily Deficit} = \text{Maintenance TDEE} - \text{Calories Consumed}$$

---

## 6. Migration to Multi-Tenant Cloud (PostgreSQL)

Because the application is built on **SQLAlchemy ORM**, migrating from local SQLite to enterprise **PostgreSQL (AWS RDS / Google Cloud SQL)** requires zero code changes:

1. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@db.example.com:5432/calora_production
   ```
2. Enable foreign key constraints in `models.py`:
   ```python
   user_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False)
   ```
