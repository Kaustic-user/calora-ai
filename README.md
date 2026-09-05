# ⚡ Calora AI - Voice-Driven Nutrition & Fitness Tracker

An intelligent, voice-first fitness and nutrition tracking web application featuring specialized **Indian cuisine intelligence**, a multi-agent AI pipeline, personalized habit memory, smart clarification handling, real-time Mifflin-St Jeor TDEE & BMR calculations, and on-demand proactive meal recommendations.

---

## 🏛️ Multi-Agent Architecture

```
User Voice Note / Text Input
          │
          ▼
1. Intent Parsing Agent (Meal vs. Workout vs. Advice)
   ├── Meal Logging ──> 2. Indian Cuisine Nutrition Agent (ICMR-NIN & Indian Unit Normalizer)
   │                    ├── 3. Clarification & Disambiguation Agent (1-tap & spoken confirmation)
   │                    └── 4. Personalization & Memory Agent (Learns cooking & dietary habits)
   │
   └── Workout Logging ─> 5. Exercise Analysis Agent (MET Equations & Calorie Burn)
          │
          ▼
6. Master Orchestrator Agent (Aggregates, Recalculates & Persists to SQLite DB)
          │
          ▼
7. Proactive Meal Recommender Agent ("Hit Your Remaining Macros" with 4 Goal Tabs)
          │
          ▼
Interactive React Dashboard (Macro Rings, Timelines, Energy Balance & Weekly Trend Charts)
```

---

## ✨ Key Features

1. **🎙️ Voice-First Logging**: Speak naturally in English or Hinglish (e.g. *"I had 2 rotis with ghee, 1 katori dal tadka, and did a 30 min run"*).
2. **🥗 Specialized Indian Cuisine Intelligence**: Understands domestic units (*katori*, *bowl*, *rotis*, *drizzle*, *plate*) and normalizes nutritional data against standard reference databases.
3. **🔥 Mifflin-St Jeor TDEE & BMR Engine**:
   - Calculates **Resting BMR** and **Maintenance TDEE** from biological sex, height ($cm$), weight ($kg$), age, and activity level ($\times 1.20$ to $\times 1.90$).
   - Standardized Deficit Formula: $\text{Daily Deficit} = \text{Maintenance TDEE} - \text{Calories Eaten}$.
4. **🧠 Long-Term Habit Memory (`user_memory`)**: Automatically learns your preferences during clarifications (e.g. *"Black coffee, no sugar"*, *"Dry roti / no ghee"*) so it never asks the same question twice.
5. **⚡ Asynchronous Multi-Clarification Flow**: Answer multiple clarification questions concurrently via speech or 1-tap options without blocking dashboard inputs.
6. **📅 Glassmorphic Date Navigator**: Persistent in-app calendar popover with quick navigation (*Today*, *Yesterday*, *Previous*, *Next*) and full historical browsing.
7. **🎨 11 Custom Theme Presets & 4 Dynamic Backgrounds**: Dynamic glassmorphic theming (Emerald, Cyber Neon, Sunset Amber, Royal Amethyst, Sapphire Blue, etc.) with animated spacetime grids and neon waves.
8. **💡 On-Demand AI Meal Recommendations**: 4 curated recipe categories (*AI Best Match*, *Under 15 Mins*, *Max Protein*, *Light & Clean*) that generate on-demand with zero token waste.
9. **📈 Weekly Trend Analytics**: Interactive 7-day charts for Calorie Trends vs. Target, Protein Consistency, and Calorie Deficit vs. TDEE Baseline.

---

## 📁 Project Structure

```
calora-ai/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routers (voice, logs, recommendations, profile)
│   │   ├── agents/           # 7 specialized AI agents (intent, nutrition, workout, memory, etc.)
│   │   ├── data/             # ICMR-NIN Indian food dataset & domestic unit mappings
│   │   ├── db/               # SQLite database connection & SQLAlchemy 2.0 models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # Gemini API service & Hybrid Nutrition calculator
│   │   └── main.py           # FastAPI application entry point
│   ├── calora.db             # Local SQLite database file
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/       # MacroRings, MealTimeline, WorkoutTimeline, DateNavigator, etc.
│   │   ├── App.jsx           # Root application dashboard
│   │   └── index.css         # Tailwind & custom glassmorphism styling
│   ├── package.json          # Node dependencies & build scripts
│   └── vite.config.js        # Vite build configuration
├── docs/                     # Technical documentation & architecture diagrams
│   ├── database.md           # Database architecture, schemas, OLTP classification & relationships
│   ├── master_orchestrator.md# Orchestrator agent technical specification
│   ├── intent_agent.md       # Intent agent specification
│   ├── nutrition_agent.md    # Nutrition agent specification
│   ├── clarification_agent.md# Clarification agent specification
│   ├── memory_agent.md       # Memory agent specification
│   ├── workout_agent.md      # Workout agent specification
│   └── recommender_agent.md  # Recommender agent specification
└── README.md
```

---

## 🚀 Step-by-Step Setup Guide

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher
- **Gemini API Key** *(Optional but recommended for full AI transcription and parsing)*

---

### Step 1: Backend Setup (FastAPI & SQLite)

1. Open your terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On macOS / Linux
   python3 -m venv venv
   source venv/bin/activate

   # On Windows
   # python -m venv venv
   # .\venv\Scripts\activate
   ```

3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure your environment variables:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and insert your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   DATABASE_URL=sqlite:///calora.db
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * The backend will start on **`http://localhost:8000`**.
   * Interactive Swagger API documentation will be available at **`http://localhost:8000/docs`**.

---

### Step 2: Frontend Setup (React & Vite)

1. Open a new terminal tab and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * The frontend dashboard will start on **`http://localhost:5173`**.

4. (Optional) Test the production build:
   ```bash
   npm run build
   ```

---

## 🎙️ Sample Voice & Text Commands to Try

- *"For breakfast I had 60 grams of Yoga Bar high protein oats with 200ml toned milk, pumpkin seeds, and a drizzle of honey."*
- *"In lunch I had 3 medium rotis with paneer lababdar, 2 katori dahi, and a cucumber salad."*
- *"Snack was 4 boiled egg whites and a black coffee."*
- *"Completed a 70-minute shoulder press and core workout at moderate intensity."*
- *"Ran 5 kilometers in 30 minutes outside."*

---

## 📚 Technical Documentation

Deep-dive architecture specs and flowcharts are available in the [`docs/`](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs) directory:

- [**Database Architecture & Schemas (`docs/database.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/database.md) - SQLite 3, SQLAlchemy 2.0 ORM, OLTP classification, $1:1$ & $1:N$ entity relationships, and embedded document normalization.
- [**Master Orchestrator (`docs/master_orchestrator.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/master_orchestrator.md) - Pipeline routing, multi-agent aggregation, and database persistence.
- [**Intent Parsing Agent (`docs/intent_agent.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/intent_agent.md) - Meal vs. Workout classification.
- [**Nutrition Agent (`docs/nutrition_agent.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/nutrition_agent.md) - ICMR-NIN database lookups, domestic unit parsing, and macro calculations.
- [**Clarification Agent (`docs/clarification_agent.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/clarification_agent.md) - Ambiguity detection and 1-tap/spoken resolution.
- [**Memory & Personalization Agent (`docs/memory_agent.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/memory_agent.md) - Habit learning and preference recall.
- [**Workout Analysis Agent (`docs/workout_agent.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/workout_agent.md) - MET formula energy expenditure and muscle targeting.
- [**Proactive Recommender Agent (`docs/recommender_agent.md`)**](file:///Users/kaustubhmahatme/.gemini/antigravity/scratch/calora-ai/docs/recommender_agent.md) - Macro gap analysis and recipe suggestions.
