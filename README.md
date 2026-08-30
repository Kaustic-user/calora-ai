# ⚡ Calora AI - Voice-Driven Nutrition & Fitness Tracker

An intelligent, voice-first fitness and nutrition tracking web application with specialized **Indian cuisine intelligence**, multi-agent AI pipeline, personalized habit memory, smart clarification handling, and proactive meal recommendations.

---

## 🏛️ Multi-Agent Architecture

```
User Voice Note / Text Input
          │
          ▼
1. Intent Parsing Agent (Meal vs Workout vs Advice)
   ├── Meal Logging ──> 2. Indian Cuisine Nutrition Agent (ICMR-NIN & Indian Unit Normalizer)
   │                    ├── 3. Clarification & Disambiguation Agent (1-tap confirmation)
   │                    └── 4. Personalization & Memory Agent (Learns habits)
   │
   └── Workout Logging ─> 5. Exercise Analysis Agent (MET Equations & Calorie Burn)
          │
          ▼
6. Master Orchestrator Agent (Aggregates & Persists to SQLite DB)
          │
          ▼
7. Proactive Meal Recommender Agent ("Hit Your Remaining Macros")
          │
          ▼
Interactive React Dashboard (Calorie Rings, Timelines, Weekly Trends)
```

---

## 📁 Project Structure

```
calora-ai/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI endpoints (voice, logs, recommendations, profile)
│   │   ├── agents/           # 7 specialized AI agents
│   │   ├── data/             # ICMR-NIN Indian food base & domestic unit conversions
│   │   ├── db/               # SQLite database & SQLAlchemy models
│   │   ├── schemas/          # Pydantic data schemas
│   │   ├── services/         # Gemini API & Hybrid Nutrition services
│   │   └── main.py           # Server entry point
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/       # VoiceRecorder, MacroRings, MealTimeline, etc.
│   │   ├── App.jsx           # Main dashboard
│   │   └── index.css         # Modern dark styling
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Start the Backend Server

```bash
cd backend
# 1. Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Set your Gemini API key in .env
# GEMINI_API_KEY=your_key_here

# 4. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend will be live at: **`http://localhost:8000`** (Swagger docs at `http://localhost:8000/docs`)

---

### 2. Start the Frontend Dashboard

```bash
cd frontend
# 1. Install npm packages
npm install

# 2. Start the Vite development server
npm run dev
```
Frontend will be live at: **`http://localhost:5173`**

---

## 🎙️ Sample Voice Commands to Try
- *"I had 2 rotis with ghee, 1 katori dal tadka, and a small bowl of curd for lunch"*
- *"For breakfast I had 1 plate poha and a cup of masala chai with sugar"*
- *"Did a 45-minute chest press and dumbbell curls workout at high intensity"*
- *"Ran for 30 minutes outside this morning"*
