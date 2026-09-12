import json
import logging
import time
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional, List

from app.db.database import get_db
from app.db.models import MealLog, WorkoutLog, UserProfile
from app.schemas.schemas import (
    AgentProcessResponse,
    AgentVoiceProcessRequest,
    MealLogCreate,
    ClarificationResolveRequest
)
from datetime import date
from app.services.gemini_service import gemini_service
from app.agents.orchestrator import orchestrator, resolve_target_date
from app.agents.nutrition_agent import nutrition_agent
from app.agents.workout_agent import workout_agent
from app.agents.memory_agent import memory_agent

logger = logging.getLogger("CaloraAI.VoiceAPI")

router = APIRouter(prefix="/api/voice", tags=["Voice & AI"])

last_cancellation_timestamp: float = 0.0

@router.post("/cancel")
def notify_cancellation(payload: dict = {}):
    """Prints and logs when user explicitly terminates/cancels the process from UI (recording discard, in-flight abort, clarification discard)"""
    global last_cancellation_timestamp
    last_cancellation_timestamp = time.time()
    stage = payload.get("stage", "general")
    details = payload.get("details", "")
    print(f"[Backend Log] User terminated the process: stage='{stage}' | details='{details}'")
    logger.info(f"[VoiceAPI] User terminated process at stage '{stage}': {details}")
    return {"status": "cancellation_logged", "stage": stage, "cancelled_at": last_cancellation_timestamp}

@router.post("/process-audio", response_model=AgentProcessResponse)
async def process_audio_file(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Transcribes WebM audio recording and routes through multi-agent orchestrator"""
    req_start_time = time.time()
    try:
        audio_bytes = await file.read()
        mime_type = file.content_type or "audio/webm"
        transcript = gemini_service.transcribe_audio(audio_bytes, mime_type)

        if await request.is_disconnected() or (req_start_time < last_cancellation_timestamp):
            print(f"[Backend Log] Discarding audio processing - process cancelled by user.")
            logger.info("[VoiceAPI] Audio process cancelled before orchestration.")
            return AgentProcessResponse(
                transcript=transcript or "",
                intent="unknown",
                operation_performed="none",
                insights=["Operation cancelled by user."]
            )

        response = orchestrator.process_voice_transcript(
            transcript=transcript or "",
            db=db,
            user_id=1,
            auto_save=True
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        logger.error(f"[VoiceAPI] Audio process error: {err_msg}")
        if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "rate limit" in err_msg.lower():
            raise HTTPException(status_code=429, detail="Gemini free tier quota temporarily reached. Please retry in a few seconds or type in the 'Type' tab.")
        raise HTTPException(status_code=500, detail=err_msg)

@router.post("/process-text", response_model=AgentProcessResponse)
async def process_text_transcript(
    request: Request,
    payload: AgentVoiceProcessRequest,
    db: Session = Depends(get_db)
):
    """Processes typed text transcript without audio transcription"""
    req_start_time = time.time()
    try:
        text = payload.text or ""
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty.")

        if await request.is_disconnected() or (req_start_time < last_cancellation_timestamp):
            print(f"[Backend Log] Discarding text processing - process cancelled by user.")
            logger.info("[VoiceAPI] Text process cancelled before orchestration.")
            return AgentProcessResponse(
                transcript=text,
                intent="unknown",
                operation_performed="none",
                insights=["Operation cancelled by user."]
            )

        response = orchestrator.process_voice_transcript(
            transcript=text,
            db=db,
            user_id=1,
            auto_save=True
        )
        return response
    except Exception as e:
        logger.error(f"[VoiceAPI] Text process error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resolve-clarification")
async def resolve_clarification(
    request: Request,
    payload: ClarificationResolveRequest,
    db: Session = Depends(get_db)
):
    """
    1. Saves user's clarification choice into personal memory.
    2. Recalculates the pending meal or workout with the exact confirmed choice explicitly.
    3. Persists the finalized record into SQLite `meal_logs` or `workout_logs`.
    """
    req_start_time = time.time()
    try:
        # 1. Save habit to UserMemory table
        memory_agent.save_habit(
            db=db,
            key=payload.clarification_id,
            value=payload.chosen_option,
            category="habit"
        )
        logger.info(f"[VoiceAPI] Saved user preference '{payload.clarification_id} = {payload.chosen_option}' into UserMemory table")

        # If there are still more questions left to answer, only save habit to memory and defer DB persistence
        if not payload.is_final:
            return {
                "status": "habit_saved",
                "learned_preference": f"{payload.clarification_id} = {payload.chosen_option}",
                "message": f"Recorded preference: '{payload.chosen_option}'."
            }

        # 2. Check if this specific clarification question belongs to Workout or Meal
        cid_lower = payload.clarification_id.lower()
        is_workout_clarification = any(w in cid_lower for w in ["workout", "running", "run", "duration", "exercise", "intensity", "reps", "sets", "pullup", "pushup", "squat", "speed", "incline"])
        is_food_clarification = any(f in cid_lower for f in ["food", "meal", "oil", "ghee", "sugar", "milk", "tea", "chai", "coffee", "portion", "paratha", "oats", "rice", "dal", "fat", "dressing", "roti"])

        is_workout = is_workout_clarification or (bool(payload.pending_workout) and not bool(payload.pending_meal) and not is_food_clarification)

        if is_workout:
            base_text = payload.raw_transcript
            if not base_text and payload.pending_workout:
                base_text = payload.pending_workout.exercise_name
            if not base_text:
                base_text = "Workout Session"

            confirmed_text = f"{base_text} for {payload.chosen_option}"
            logger.info(f"[VoiceAPI] Recalculating workout expenditure for: \"{confirmed_text}\"")

            profile = db.query(UserProfile).filter(UserProfile.id == 1).first()
            user_weight = profile.weight_kg if profile and profile.weight_kg else 70.0
            user_memory = memory_agent.get_user_context(db)
            recalculated_workout, _ = workout_agent.parse_workout(
                text=confirmed_text,
                user_weight_kg=user_weight,
                user_memory=user_memory
            )

            finalized_workout = recalculated_workout or payload.pending_workout
            if finalized_workout:
                if await request.is_disconnected() or (req_start_time < last_cancellation_timestamp):
                    print(f"[Backend Log] Discarding clarified workout '{finalized_workout.exercise_name}' - cancelled by user.")
                    logger.warning("[VoiceAPI] User cancelled request before workout persistence.")
                    return {"status": "cancelled", "message": "Cancelled by user without saving."}

                target_d, _ = resolve_target_date(payload.raw_transcript)
                w_date = payload.log_date or (finalized_workout.log_date if finalized_workout.log_date else (payload.pending_workout.log_date if payload.pending_workout and payload.pending_workout.log_date else target_d))
                if not w_date:
                    w_date = date.today()

                db_workout = WorkoutLog(
                    exercise_name=finalized_workout.exercise_name,
                    workout_category=finalized_workout.workout_category,
                    duration_minutes=finalized_workout.duration_minutes,
                    intensity=finalized_workout.intensity,
                    calories_burned=finalized_workout.calories_burned,
                    muscle_groups=finalized_workout.muscle_groups,
                    notes=f"Confirmed: {payload.chosen_option}",
                    log_date=w_date
                )
                db.add(db_workout)
                db.commit()
                db.refresh(db_workout)
                logger.info(f"[Database] Successfully persisted clarified workout '{db_workout.exercise_name}' (id={db_workout.id}, burned={db_workout.calories_burned} kcal, date={w_date})")

                return {
                    "status": "confirmed_and_logged",
                    "workout_id": db_workout.id,
                    "exercise_name": db_workout.exercise_name,
                    "calories_burned": db_workout.calories_burned,
                    "duration_minutes": db_workout.duration_minutes,
                    "log_date": str(w_date),
                    "navigation_date": str(w_date),
                    "message": f"Recorded {db_workout.exercise_name} ({db_workout.duration_minutes} mins, {db_workout.calories_burned} kcal burned)!"
                }

        # Otherwise: Nutrition Pipeline
        profile = db.query(UserProfile).filter(UserProfile.id == 1).first()
        dietary_pref = profile.dietary_preference if profile else "vegetarian"
        user_memory = memory_agent.get_user_context(db)

        base_text = payload.raw_transcript
        if not base_text and payload.pending_meal:
            base_text = payload.pending_meal.meal_title
        if not base_text:
            base_text = "Beverage / Meal"

        confirmed_text = f"{base_text} (Prepared with: {payload.chosen_option})"
        logger.info(f"[VoiceAPI] Recalculating meal macros for: \"{confirmed_text}\"")

        recalculated_meals, _ = nutrition_agent.parse_meal(
            text=confirmed_text,
            user_preference=dietary_pref,
            user_memory=user_memory
        )

        finalized_meals: List[MealLogCreate] = []
        if isinstance(recalculated_meals, list) and len(recalculated_meals) > 0:
            finalized_meals = recalculated_meals
        elif payload.pending_meal:
            finalized_meals = [payload.pending_meal]

        if finalized_meals:
            if await request.is_disconnected() or (req_start_time < last_cancellation_timestamp):
                print(f"[Backend Log] Discarding clarified meal '{finalized_meals[0].meal_title}' - cancelled by user.")
                logger.warning("[VoiceAPI] User cancelled request before meal persistence.")
                return {"status": "cancelled", "message": "Cancelled by user without saving."}

            saved_records = []
            for meal in finalized_meals:
                target_d, _ = resolve_target_date(payload.raw_transcript)
                m_date = payload.log_date or (meal.log_date if meal.log_date else (payload.pending_meal.log_date if payload.pending_meal and payload.pending_meal.log_date else target_d))
                if not m_date:
                    m_date = date.today()

                db_meal = MealLog(
                    meal_type=meal.meal_type,
                    meal_title=meal.meal_title,
                    raw_transcript=confirmed_text,
                    items_json=json.dumps([item.model_dump() for item in meal.items]),
                    calories=meal.calories,
                    protein_g=meal.protein_g,
                    carbs_g=meal.carbs_g,
                    fat_g=meal.fat_g,
                    fiber_g=meal.fiber_g,
                    assumptions_json=json.dumps(meal.assumptions + [f"Confirmed: {payload.chosen_option}"]),
                    is_confirmed=True,
                    log_date=m_date
                )
                db.add(db_meal)
                db.commit()
                db.refresh(db_meal)
                saved_records.append(db_meal)
                logger.info(f"[Database] Successfully persisted clarified meal '{db_meal.meal_title}' (id={db_meal.id}, calories={db_meal.calories} kcal, date={m_date}) into SQLite")

            titles = ", ".join(m.meal_title for m in saved_records)
            total_cals = round(sum(m.calories for m in saved_records), 1)

            return {
                "status": "confirmed_and_logged",
                "meal_id": saved_records[0].id if saved_records else None,
                "meal_title": titles,
                "calories": total_cals,
                "protein_g": saved_records[0].protein_g if saved_records else 0,
                "log_date": str(saved_records[0].log_date if saved_records else date.today()),
                "navigation_date": str(saved_records[0].log_date if saved_records else date.today()),
                "message": f"Logged {titles} ({total_cals} kcal total) with preference '{payload.chosen_option}'!"
            }

        return {"status": "saved", "learned_preference": f"{payload.clarification_id} = {payload.chosen_option}"}
    except Exception as e:
        logger.error(f"[VoiceAPI] Clarification resolution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/resolve-clarification-audio")
async def resolve_clarification_audio(
    request: Request,
    file: UploadFile = File(...),
    clarification_id: str = Form(...),
    raw_transcript: Optional[str] = Form(None),
    pending_meal_title: Optional[str] = Form(None),
    pending_workout_name: Optional[str] = Form(None),
    log_date: Optional[str] = Form(None),
    is_final: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Accepts spoken audio clarification (e.g. "I ran for 45 minutes" or "Black coffee with stevia"),
    transcribes it, recalculates macros/burn, cleans habit for UserMemory, and logs the record.
    """
    req_start_time = time.time()
    try:
        audio_bytes = await file.read()
        mime_type = file.content_type or "audio/webm"

        # 1. Transcribe the spoken clarification snippet
        spoken_clarification = gemini_service.transcribe_audio(audio_bytes, mime_type).strip()
        if not spoken_clarification:
            spoken_clarification = "Custom preparation"

        logger.info(f"[VoiceAPI] Spoken clarification transcribed: \"{spoken_clarification}\"")

        # 2. Extract clean habit value (concise 2-5 words)
        clean_habit_value = spoken_clarification
        if len(spoken_clarification.split()) > 3:
            clean_summary = gemini_service.generate_json_response(
                prompt=f"Extract concise preference from spoken clarification '{spoken_clarification}' for question '{clarification_id}'.",
                system_instruction="Output JSON with format: {'clean_preference': string (e.g. '45 Minutes', 'Americano / Espresso + Water', 'Dry / No Ghee')}"
            )
            if clean_summary and clean_summary.get("clean_preference"):
                clean_habit_value = clean_summary.get("clean_preference")

        # Save clean habit to UserMemory table
        memory_agent.save_habit(
            db=db,
            key=clarification_id,
            value=clean_habit_value,
            category="habit"
        )
        logger.info(f"[VoiceAPI] Clean habit '{clarification_id} = {clean_habit_value}' saved to UserMemory")

        # If there are still more questions left to answer, only save habit to memory and defer DB persistence
        if not is_final:
            return {
                "status": "habit_saved",
                "learned_preference": f"{clarification_id} = {clean_habit_value}",
                "message": f"Recorded preference: '{clean_habit_value}'."
            }

        # 3. Check if this specific clarification question belongs to Workout or Meal
        cid_lower = clarification_id.lower()
        is_workout_clarification = any(w in cid_lower for w in ["workout", "running", "run", "duration", "exercise", "intensity", "reps", "sets", "pullup", "pushup", "squat", "speed", "incline"])
        is_food_clarification = any(f in cid_lower for f in ["food", "meal", "oil", "ghee", "sugar", "milk", "tea", "chai", "coffee", "portion", "paratha", "oats", "rice", "dal", "fat", "dressing", "roti"])

        is_workout = is_workout_clarification or (bool(pending_workout_name) and not bool(pending_meal_title) and not is_food_clarification)

        if is_workout:
            base_text = raw_transcript or pending_workout_name or "Workout"
            confirmed_text = f"{base_text} {spoken_clarification}"
            logger.info(f"[VoiceAPI] Recalculating workout for: \"{confirmed_text}\"")

            profile = db.query(UserProfile).filter(UserProfile.id == 1).first()
            user_weight = profile.weight_kg if profile and profile.weight_kg else 70.0
            user_memory = memory_agent.get_user_context(db)
            recalculated_workout, _ = workout_agent.parse_workout(
                text=confirmed_text,
                user_weight_kg=user_weight,
                user_memory=user_memory
            )

            if recalculated_workout:
                if await request.is_disconnected() or (req_start_time < last_cancellation_timestamp):
                    print(f"[Backend Log] Discarding clarified workout '{recalculated_workout.exercise_name}' - cancelled by user.")
                    logger.warning("[VoiceAPI] User cancelled request before workout persistence.")
                    return {"status": "cancelled", "message": "Cancelled by user without saving."}

                w_date = None
                if log_date:
                    try:
                        w_date = date.fromisoformat(log_date)
                    except Exception:
                        pass
                if not w_date and raw_transcript:
                    target_d, _ = resolve_target_date(raw_transcript)
                    w_date = target_d
                if not w_date:
                    w_date = date.today()

                db_workout = WorkoutLog(
                    exercise_name=recalculated_workout.exercise_name,
                    workout_category=recalculated_workout.workout_category,
                    duration_minutes=recalculated_workout.duration_minutes,
                    intensity=recalculated_workout.intensity,
                    calories_burned=recalculated_workout.calories_burned,
                    muscle_groups=recalculated_workout.muscle_groups,
                    notes=f"Confirmed via voice: {clean_habit_value}",
                    log_date=w_date
                )
                db.add(db_workout)
                db.commit()
                db.refresh(db_workout)

                return {
                    "status": "confirmed_and_logged",
                    "workout_id": db_workout.id,
                    "exercise_name": db_workout.exercise_name,
                    "calories_burned": db_workout.calories_burned,
                    "duration_minutes": db_workout.duration_minutes,
                    "log_date": str(w_date),
                    "navigation_date": str(w_date),
                    "message": f"Recorded {db_workout.exercise_name} ({db_workout.duration_minutes} mins, {db_workout.calories_burned} kcal burned)!"
                }

        # Nutrition flow
        profile = db.query(UserProfile).filter(UserProfile.id == 1).first()
        dietary_pref = profile.dietary_preference if profile else "vegetarian"
        user_memory = memory_agent.get_user_context(db)

        base_text = raw_transcript or pending_meal_title or "Meal"
        confirmed_text = f"{base_text} (Prepared with: {spoken_clarification})"
        logger.info(f"[VoiceAPI] Recalculating meal macros for: \"{confirmed_text}\"")

        recalculated_meals, _ = nutrition_agent.parse_meal(
            text=confirmed_text,
            user_preference=dietary_pref,
            user_memory=user_memory
        )

        if recalculated_meals:
            if await request.is_disconnected() or (req_start_time < last_cancellation_timestamp):
                print(f"[Backend Log] Discarding clarified audio meal '{recalculated_meals[0].meal_title}' - cancelled by user.")
                logger.warning("[VoiceAPI] User cancelled request before meal persistence.")
                return {"status": "cancelled", "message": "Cancelled by user without saving."}

            m_date = None
            if log_date:
                try:
                    m_date = date.fromisoformat(log_date)
                except Exception:
                    pass
            if not m_date and raw_transcript:
                target_d, _ = resolve_target_date(raw_transcript)
                m_date = target_d
            if not m_date:
                m_date = date.today()

            saved_records = []
            for meal in recalculated_meals:
                db_meal = MealLog(
                    meal_type=meal.meal_type,
                    meal_title=meal.meal_title,
                    raw_transcript=confirmed_text,
                    items_json=json.dumps([item.model_dump() for item in meal.items]),
                    calories=meal.calories,
                    protein_g=meal.protein_g,
                    carbs_g=meal.carbs_g,
                    fat_g=meal.fat_g,
                    fiber_g=meal.fiber_g,
                    assumptions_json=json.dumps(meal.assumptions + [f"Voice Confirmed: {clean_habit_value}"]),
                    is_confirmed=True,
                    log_date=m_date
                )
                db.add(db_meal)
                db.commit()
                db.refresh(db_meal)
                saved_records.append(db_meal)

            titles = ", ".join(m.meal_title for m in saved_records)
            total_cals = round(sum(m.calories for m in saved_records), 1)

            return {
                "status": "confirmed_and_logged",
                "meal_id": saved_records[0].id if saved_records else None,
                "meal_title": titles,
                "calories": total_cals,
                "protein_g": saved_records[0].protein_g if saved_records else 0,
                "log_date": str(m_date),
                "navigation_date": str(m_date),
                "message": f"Logged {titles} ({total_cals} kcal total) with preference '{clean_habit_value}'!"
            }

        return {"status": "saved", "learned_preference": f"{clarification_id} = {clean_habit_value}"}
    except Exception as e:
        logger.error(f"[VoiceAPI] Audio clarification resolution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
