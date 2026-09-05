# 📋 Calora AI — Issues, Fixes & Roadmap Changelog

This document tracks all issues, architectural refinements, and bug fixes made during the development of Calora AI, as well as upcoming features and planned improvements.

---

## ✅ Resolved Issues & Refinements

### 1. Python Environment & Uvicorn Module Collision
* **Issue**: Running `uvicorn` directly in macOS triggered the global Python interpreter instead of the activated `venv`, failing with `ModuleNotFoundError: No module named 'sqlalchemy'`.
* **Fix**: Updated runner instructions to explicitly invoke `python -m uvicorn app.main:app --reload --port 8000`.

### 2. Silent Demo Fallback on Missing API Key
* **Issue**: When `GEMINI_API_KEY` was unset, audio recording silently returned a hardcoded sample meal (`Roti with Ghee + Dal`) every time without indicating why.
* **Fix**: Added prominent startup warnings in the backend logs and explicit status reporting to inform the user when running in Demo vs. Live AI mode.

### 3. Professional Backend Logging
* **Issue**: Initial backend logs contained emojis and informal formatting.
* **Fix**: Refactored all loggers in `gemini_service.py` and `orchestrator.py` to use clean, standard enterprise formatting (`[INFO]`, `[WARNING]`, `[ERROR]`, `[GeminiService]`, `[Orchestrator]`) with standard timestamps and zero emojis.

### 4. Deprecated Gemini Model (404 Not Found)
* **Issue**: Google API returned `404 NOT_FOUND` for `models/gemini-2.5-flash` for new API keys, recommending `gemini-3.6-flash`.
* **Fix**: Upgraded default models to `gemini-3.6-flash` (and `gemini-3.7-flash`), and made text and audio models configurable via `GEMINI_MODEL` and `GEMINI_AUDIO_MODEL` in `.env`.

### 5. Static Food DB Limitation & Architecture Cleanup
* **Issue**: `indian_food_db.json` and `nutrition_service.py` limited food parsing to a static list of 30 dishes.
* **Fix**: Upgraded `NutritionAgent` to a Pure-LLM engine that calculates dynamic macros for any regional Indian or international dish on the fly. Safely deleted redundant static database files.

### 6. Hardcoded Clarification Agent Refactor
* **Issue**: `clarification_agent.py` only checked 3 hardcoded keyword rules (`chai`, `roti`, `paratha`) without utilizing AI.
* **Fix**: Refactored `ClarificationAgent` into a dedicated Gemini AI Agent that dynamically detects high-impact ambiguous variables (>15% calorie delta) for any meal or workout, and connected 1-tap options directly to `UserMemory` in `calora.db`.

### 7. Custom Quick-Fill Sample Buttons in UI
* **Issue**: The sample buttons in the "Type" tab contained old generic prompts.
* **Fix**: Updated default buttons in `VoiceRecorder.jsx` to:
  1. `60g of Yogabar oats`
  2. `Paneer with 3 roti`
  3. `45 min chest workout`

### 8. Confetti Triggering on Unknown Intent & Lack of Guidance
* **Issue**: Saying unrelated text or noise resolved to `intent: "unknown"` but still fired celebratory confetti on the dashboard and gave no feedback.
* **Fix**:
  - Updated `orchestrator.py` to return helpful conversational guidance when intent is unrecognized.
  - Updated `App.jsx` so celebratory confetti *only* fires when a valid meal or workout is detected.

### 9. Top Notification TTL & Auto-Dismiss Timer
* **Issue**: Top notification banners persisted indefinitely until manually dismissed.
* **Fix**: Implemented a 6-second TTL auto-dismiss timer with an animated visual countdown progress bar in `App.jsx` and `index.css`.

### 10. Live Multi-Theme Engine (6 Pure Dark Palettes)
* **Issue**: User requested option to choose and preview different premium dark themes on the fly.
* **Fix**:
  - Built a dynamic CSS Variable-based theme engine supporting 6 dark palettes (Synthwave Horizon, Midnight Cyber, Emerald Matrix, Stealth Performance, Obsidian & Gold, Abyss Bioluminescent).
  - Added a clean **Theme Selector Modal** with live swatch previews and instant 1-click switching (persists in `localStorage`).

### 11. Curated Interactive Canvas Backgrounds (Top 5 Physics & Health Styles)
* **Issue**: Streamlined background options down to the top 5 cleanest, highest-performing interactive backgrounds:
  1. ⚛️ **Einstein Spacetime Grid** (`spacetime`)
  2. ⚡ **Metabolic ATP Lattice** (`metabolic`)
  3. 🧪 **Amino Acid Peptide Chains** (`amino`)
  4. 🧲 **Magnetic Monopole Field** (`magnetic`)
  5. 🪐 **Interstellar Lensing** (`interstellar`)
* **Fix**: Cleaned up unnecessary background renderers and updated `BackgroundSelectorModal.jsx`.

### 12. Metabolic ATP Lattice Full-Screen Height Fix
* **Issue**: In `initMetabolic`, the vertical loop calculation used `rows = height / h` with step `h / 2`, resulting in hexagons only filling the top half of the screen.
* **Fix**: Corrected the vertical and horizontal step bounds (`stepX = 46`, `stepY = 28`, `rows = Math.ceil(height / stepY) + 3`) so the hexagonal metabolic matrix renders 100% full-screen coverage across the entire viewport.

### 13. Pre-Log Clarification Confirmation Flow
* **Issue**: Previously, ambiguous meals were saved to the database immediately with standard default assumptions, and only asked for clarification after the fact.
* **Fix**:
  - Refactored `orchestrator.py` to hold ambiguous meals in a pending state without saving premature defaults to the SQLite DB.
  - When the user selects their clarification option (e.g. *"No Sugar"*), `voice.py` re-calculates the exact macros, saves the habit to `UserMemory`, persists the finalized `MealLog` into `calora.db`, and triggers celebratory feedback.

### 14. Explicit Macro Recalculation on Confirmation & AI Memory Management UI
* **Issue**: When clarifying, the backend was not appending the confirmed choice explicitly to the nutrition recalculation prompt.
* **Fix**:
  - In `voice.py`, `resolve_clarification` now appends the explicit confirmed preparation `"(Prepared with: {chosen_option})"` to the prompt, recalculating precise macros (e.g. 5 kcal black coffee, 25 kcal unsweetened tea).
  - Added a dedicated **"Learned Habits & Memory"** tab in Settings (`UserProfileModal.jsx`).

### 15. Header & Learned Memory UI Cleanups
* **Issue**: User requested removing unnecessary emojis and badge clutter in the header and memory manager.
* **Fix**:
  - Removed finger emoji from the Learned Habits cards in `UserProfileModal.jsx`.
  - Removed icon emoji in brackets from the Background button in top navigation.
  - Removed extra badge text beside the logo while preserving the signature ⚡ thunderbolt brand mark.

### 16. Voice Clarification Support ("Speak Answer" Mic)
* **Issue**: Users previously had to tap one of the pre-set buttons to answer a clarification question, with no way to speak custom preparation details.
* **Fix**:
  - Added a small, responsive **"Speak Answer"** microphone button right beside the 1-tap option pills in `ClarificationBanner.jsx`.
  - Added `POST /api/voice/resolve-clarification-audio` in `voice.py` to transcribe the spoken voice snippet, recalculate meal macros, save the spoken habit to `UserMemory`, and log the finalized meal in SQLite.

### 17. Spoken Clarification State Isolation & Cross-Contamination Fix
* **Issue**: When the user spoke a multi-dish lunch note while a coffee clarification card was open, the whole lunch sentence was mistakenly saved as the value of `coffee_type` memory, and two conflicting meals were logged.
* **Fix**:
  - Cleaned up corrupted memory keys and duplicate rows in `calora.db`.
  - In `voice.py`, added AI preference extraction to ensure `user_memory` only stores clean, concise habit phrases.
  - Added a **Dismiss (X)** button to `<ClarificationBanner />` so pending questions can be closed at any time.

### 18. Fallback Nutrition Parser & Beverage Recognition
* **Issue**: When the offline fallback parser triggered, it lacked beverage checks (Coffee, Tea, Chai) and defaulted unparsed items to "Homestyle Balanced Meal" / "Phulka with Ghee".
* **Fix**:
  - Upgraded `nutrition_agent.py` offline parser to accurately identify Coffee (`75 kcal`), Black Coffee (`5 kcal`), Chai (`65 kcal`), Green/Black Tea (`2 kcal`), Unsweetened Tea (`35 kcal`), and Oatmeal (`230 kcal`).

### 19. Google GenAI Automatic Function Calling (AFC) Warning Suppression
* **Issue**: Official Google Python SDK printed an internal advisory warning about Automatic Function Calling when invoking `generate_content`.
* **Fix**: Suppressed internal SDK logger messages (`google.genai`) in `gemini_service.py` to maintain clean, quiet, and professional terminal output.

### 20. Zero-Latency Fast-Path Intent Routing & Single-Pass Optimization
* **Issue**: Every speech or text note previously made 3 sequential round-trips to Gemini (Intent ➔ Nutrition ➔ Clarification), causing 4–5s total latency.
* **Fix**:
  - Implemented a 2-Tier Intent Classifier in `intent_agent.py`:
    - **Tier 1 (Fast-Path, <0.02ms)**: Compiled regex engine accurately classifies Food logs (`meal`), Exercise logs (`workout`), and Combined logs (`both`) locally in sub-millisecond time.
    - **Tier 2 (Gemini LLM)**: Gracefully fails over to Gemini for ambiguous / conversational questions.
  - In `orchestrator.py`, optimized `NutritionAgent` to return food breakdown and inline clarification items in a **single turn**, eliminating redundant round-trips.
  - Created automated benchmark suite (`backend/tests/benchmark_latency.py`) verifying **100.0% accuracy** at an average latency of **0.014 ms**.

### 21. Workout Pre-Log Protection & Clarification Recalculation
* **Issue**: Previously, ambiguous workouts (e.g. "I ran" with missing duration or intensity) were auto-saved immediately to SQLite with default values before the user answered the clarification question.
* **Fix**:
  - Upgraded `workout_agent.py` with inline clarification detection and past-tense verb recognition (`ran`, `walked`, `cycled`, `swam`).
  - Refactored `orchestrator.py` to hold ambiguous workouts in a pending state with **Pre-Log Protection**.
  - In `voice.py`, `resolve_clarification` and `resolve_clarification_audio` now dynamically recalculate metabolic burn for confirmed workout durations (e.g. 45 mins), save the preference to `user_memory`, and persist the finalized `WorkoutLog`.
  - Updated `ClarificationBanner.jsx` and `App.jsx` to render pending workout cards and handle 1-tap/spoken resolution.

### 22. User Profile Body Weight Integration with MET Workout Calculation
* **Issue**: `UserProfile` lacked a body weight field, causing the MET workout calculation to default to a static 70.0 kg for all users regardless of actual physical weight.
* **Fix**:
  - Added `weight_kg` column to `user_profiles` in `calora.db` and updated `UserProfileSchema`.
  - Added **Body Weight (kg)** input in the Settings Modal (`UserProfileModal.jsx`).
  - Connected `profile.weight_kg` dynamically through `orchestrator.py` and `voice.py` into `workout_agent.parse_workout(user_weight_kg=...)` for exact, personalized metabolic expenditure calculations.

### 23. Dynamic AI Macro Synthesis in Recommender Agent
* **Issue**: `recommender_agent.py` previously used a static list of 5 hardcoded recipes that lacked real-time macro-solving, dietary variety, or time-of-day awareness.
* **Fix**:
  - Upgraded `recommender_agent.py` to use Gemini structured JSON generation to solve for the user's exact remaining daily macro budget ($\pm 5\%$).
  - Added **Variety Awareness**: Inspects today's `MealLog` history to prevent duplicating the same protein sources eaten earlier in the day.
  - Added **Time Context**: Automatically tailors suggestions for Breakfast, Lunch, Evening Snack, or Dinner based on local time.
  - Enhanced `MealRecommender.jsx` with interactive filter pills (`✨ AI Best Match`, `⚡ Under 15 Mins`, `💪 Max Protein`, `🥗 Light & Clean`) and dynamic loading state.

### 24. Multi-Meal Segmentation & Full-Day Voice Ingestion
* **Issue**: Speaking a full day's food log in a single note (e.g. "For breakfast I had oats, for lunch 2 rotis with dal, and for dinner paneer") previously bundled everything into one single timeline card.
* **Fix**:
  - Upgraded `nutrition_agent.py` to support **Multi-Meal Segmentation**, detecting distinct periods (`breakfast`, `lunch`, `dinner`, `snack`) and parsing them into an array of separate meal objects.
  - Updated `orchestrator.py` to insert separate strongly-typed records into `meal_logs` table for each meal period.
  - Added `detected_meals: List[MealLogCreate]` to `AgentProcessResponse` while preserving single-meal backwards compatibility.

### 25. False-Positive Workout Routing on "Yoga Bar", Clarification Target Isolation & Multi-Question UI State Safety
* **Issue**:
  1. The phrase `"Yoga Bar oats"` falsely triggered the workout classifier because `"yoga"` matched in `WORKOUT_ITEMS_REGEX`, causing the orchestrator to classify the note as `both` (Meal + Workout).
  2. Because a phantom workout was pending, answering food clarifications (e.g. `paratha_fat_check`, `rajma_rice_portion`) routed to `WorkoutAgent`, saving 0 kcal workouts into SQLite instead of food logs.
  3. When multiple clarification questions were pending, answering the first question prematurely wiped the pending state, causing `ClarificationBanner.jsx` to throw a `TypeError` and render a blank UI screen.
* **Fix**:
  - In `intent_agent.py`, added negative lookahead `r'yoga(?!\s*bar)'` and registered `yoga bar` explicitly under `FOOD_ITEMS_REGEX`.
  - In `voice.py`, strictly isolated food vs. workout questions by inspecting the `clarification_id` to ensure food questions always route to `NutritionAgent`.
  - In `ClarificationBanner.jsx` and `App.jsx`, used safe optional chaining (`pendingMeal?.meal_title || pendingWorkout?.exercise_name`) and retained pending state until all active clarification questions are completed.

### 26. Free-Tier Rate Limit (429) Shield, 6-Model Cascade Pool & Recommender TTL Caching
* **Issue**: Frequent page refreshes and rapid audio recordings exhausted Google AI Studio's 20 RPM free-tier quota on preview models (`gemini-3.7-flash`, `gemini-3.6-flash`), throwing `429 RESOURCE_EXHAUSTED` and unhandled 500 errors.
* **Fix**:
  - Expanded `GeminiService` fallback pool across 6 independent Google model quota buckets (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`).
  - Added in-memory 5-minute TTL caching in `RecommenderAgent` to prevent duplicate LLM calls on page loads/re-renders.
  - Updated `voice.py` and `VoiceRecorder.jsx` to catch 429 quota exceptions and present a clean, friendly actionable banner instead of crashing.

### 27. Live 7-Day Weekly Trends Engine & Dynamic Metric Badges
* **Issue**: The **Trends** tab in `ProgressCharts.jsx` used hardcoded sample data rather than querying actual user logs from SQLite.
* **Fix**:
  - Added `GET /api/logs/weekly-trends` endpoint in `logs.py` aggregating rolling 7-day calorie intake, protein, workout burns, and active consistency.
  - Upgraded `ProgressCharts.jsx` with dynamic live Area & Bar charts with target reference lines and 4 weekly metric badges (Avg Daily Intake, Avg Protein, 7-Day Burn, Consistency).

### 28. Dashboard Layout Prioritization (Logged Entries Above Recommender)
* **Issue**: User requested moving the "Hit Your Remaining Macros" recommender section to the bottom of the dashboard so Today's Meals and Workouts appear prominently at the top.
* **Fix**:
  - Reordered sections in `App.jsx` so the primary user journey flows:
    1. Daily Macro Rings
    2. Today's Meals Timeline
    3. Today's Workouts Timeline
    4. Proactive AI Meal Recommender ("Hit Your Remaining Macros") at the bottom.

### 29. Top-Down Quality Hierarchy for Gemini Reasoning & Audio Pipelines
* **Issue**: Previously, `gemini-2.5-flash` was placed at the top of the fallback list, triggering 404s for newer keys before reaching the best models.
* **Fix**:
  - Reorganized `GeminiService` fallback hierarchy in strict **Top-Down descending quality order**:
    - **Text / JSON / Nutrition**: `gemini-3.7-flash` ➔ `gemini-3.6-flash` ➔ `gemini-3.5-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-3.5-flash-lite` ➔ `gemini-flash-latest` ➔ `gemini-2.0-flash`.
    - **Audio / STT**: `gemini-3.7-flash` ➔ `gemini-3.6-flash` ➔ `gemini-3.5-flash` ➔ `gemini-2.0-flash` ➔ `gemini-flash-latest`.

### 30. Silent Audio Empty Return Bug Fix & Speech Fallthrough Prevention
* **Issue**: When an audio note had low volume, background silence, or very short duration (<1s), `gemini-3.5-transcribe` returned `200 OK` with an empty string `""`. Because `if response.text` was falsy, `gemini_service.py` failed to exit and continued cascading to remaining models, triggering 429 quota errors.
* **Fix**:
  - Updated `GeminiService.transcribe_audio` to check `if response is not None` and return the transcript immediately upon successful `200 OK`.
  - Added empty transcript guard in `orchestrator.py` to return user guidance (*"No clear speech detected"*) without throwing errors.

### 31. Silent Audio Handling (Graceful 200 OK with Guidance)
* **Issue**: In `voice.py`, empty audio transcripts previously raised `HTTPException(400, "Could not transcribe audio")`.
* **Fix**:
  - Passed empty transcripts directly to `Orchestrator` to return `200 OK` with friendly conversational tips (*"No clear speech detected in recording. Please hold mic and speak your meal or workout!"*).

### 32. Speech Transcription Fix & Real-Time Audio Chunk Buffering
* **Issue**: `gemini-3.5-transcribe` returned empty text `""` on standard `generate_content` audio prompts, causing spoken audio to return blank. Additionally, the browser's `MediaRecorder` was not flushing intermediate timeslices before stop.
* **Fix**:
  - Switched the Audio STT cascade to proven multimodal models (`gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-2.0-flash`).
  - Added `mediaRecorder.start(250)` timeslice buffering and explicit `requestData()` flush on stop in `VoiceRecorder.jsx` and `ClarificationBanner.jsx`.

### 33. Multi-Clarification Question Deduplication (Batch Deferral until Final Answer)
* **Issue**: When a full-day note had 3 clarification questions (e.g. Coffee, Parathas, Rajma Rice), answering *each* question was recalculating and inserting all 3 meals into SQLite, resulting in 9 duplicate meal rows (3x each meal).
* **Fix**:
  - Added `is_final` flag to `ClarificationResolveRequest` and `App.jsx`.
  - Intermediate questions (`is_final: false`) now only save habits/preferences into `UserMemory` table without writing duplicate meal rows to SQLite.
  - The final answered question (`is_final: true`) recalculates the full-day meals with all confirmed habits active and persists each meal into SQLite **EXACTLY ONCE**.

### 34. Workout Timeline Muscle Groups String/Array Defensive Parsing
* **Issue**: In `WorkoutTimeline.jsx`, `workout.muscle_groups` was assumed to be an array, but the database returned it as a comma-separated string (e.g. `"Chest, Triceps"`). Calling `workout.muscle_groups.map()` threw a `TypeError`, unmounting the React DOM tree and causing a blank screen after logging a workout.
* **Fix**:
  - Added defensive parsing in `WorkoutTimeline.jsx` to dynamically handle both strings and arrays, splitting comma-separated strings into badge pills without errors.

### 35. Net Calorie Circular Progress Ring Integration
* **Issue**: The circular progress ring meter previously calculated percentage based only on gross food intake (`calories_consumed / target`), which did not roll back when the user logged workouts.
* **Fix**:
  - Updated `MacroRings.jsx` to calculate `calPercent` and SVG stroke dash offset from **Net Calories** (`max(0, calories_consumed - calories_burned) / target`).
  - Exercising and burning calories now dynamically rolls the ring backward, visually expanding your remaining daily energy budget.

### 36. API Layer Cleanups, Defensive JSON Parsing & Net Recommender Budgeting
* **Issue**: Unused imports, non-standard delete error codes, unguarded JSON deserialization, and missing workout burn credits in the meal recommender endpoint.
* **Fix**:
  - Cleaned up unused imports in `logs.py`, `profile.py`, and `voice.py`.
  - Added safe `try/except` fallbacks in `logs.py` when decoding `items_json` and `assumptions_json`.
  - Standardized `delete_memory` in `profile.py` to raise HTTP 404 for missing records.
  - In `recommendations.py`, factored in today's workout burned calories into remaining calorie budget calculations.
  - Wrapped `resolve_clarification` in `voice.py` in an error handling try/except envelope.

---

## 🔮 Upcoming Roadmap / Future Enhancements

- [ ] **Real-time Live Audio Waveform & Speech-to-Text Streaming**: Integrate bidirectional streaming using Gemini Live API.
- [ ] **Multimodal Photo Ingestion**: Allow snapping a photo of food/thali alongside voice notes for portion estimation.
- [ ] **Multi-Day Macro Export**: Add 1-click export of nutrition history to CSV and PDF reports.
- [ ] **Adaptive TDEE & Weight Logging**: Dynamic calorie target adjustment based on weekly weigh-in trends.
- [ ] **Offline PWA (Progressive Web App)**: Installable mobile shortcut on iOS & Android.

---

*Last Updated: 2026-08-30*
