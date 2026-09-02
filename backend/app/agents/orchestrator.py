import re
import json
import logging
from datetime import date, datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session

from app.agents.intent_agent import intent_agent
from app.agents.nutrition_agent import nutrition_agent
from app.agents.workout_agent import workout_agent
from app.agents.clarification_agent import clarification_agent
from app.agents.memory_agent import memory_agent
from app.services.gemini_service import gemini_service
from app.schemas.schemas import AgentProcessResponse, MealLogCreate, WorkoutLogCreate
from app.db.models import MealLog, WorkoutLog, UserProfile

logger = logging.getLogger("CaloraAI.Orchestrator")

MONTH_MAP = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10, "october": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12
}

WEEKDAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6
}

def resolve_target_date(text: str) -> date:
    """Extracts and normalizes explicit or relative dates from natural language transcript"""
    text_lower = text.lower()
    today = date.today()

    if "day before yesterday" in text_lower:
        return today - timedelta(days=2)
    elif "yesterday" in text_lower or "last night" in text_lower or "last evening" in text_lower:
        return today - timedelta(days=1)
    
    # Check "X days ago"
    days_ago_match = re.search(r'(\d+)\s+days?\s+ago', text_lower)
    if days_ago_match:
        days = int(days_ago_match.group(1))
        return today - timedelta(days=days)

    # Check weekday expressions: "on monday", "last friday"
    for day_name, target_weekday in WEEKDAY_MAP.items():
        if f"on {day_name}" in text_lower or f"last {day_name}" in text_lower:
            current_weekday = today.weekday()
            delta_days = (current_weekday - target_weekday) % 7
            if delta_days == 0:
                delta_days = 7
            return today - timedelta(days=delta_days)

    # Check date strings: "28th august", "aug 30", "1st september"
    date_pattern1 = re.search(r'(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*', text_lower)
    if date_pattern1:
        day_num = int(date_pattern1.group(1))
        month_str = date_pattern1.group(2)
        month_num = MONTH_MAP.get(month_str, today.month)
        try:
            return date(today.year, month_num, day_num)
        except ValueError:
            pass

    date_pattern2 = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?', text_lower)
    if date_pattern2:
        month_str = date_pattern2.group(1)
        day_num = int(date_pattern2.group(2))
        month_num = MONTH_MAP.get(month_str, today.month)
        try:
            return date(today.year, month_num, day_num)
        except ValueError:
            pass

    return today

class MasterOrchestratorAgent:
    def process_voice_transcript(
        self, 
        transcript: str, 
        db: Session, 
        user_id: int = 1,
        auto_save: bool = True
    ) -> AgentProcessResponse:
        """Coordinates multi-agent pipeline and handles temporal CRUD & history queries"""
        logger.info(f"[Orchestrator] Processing transcript: \"{transcript}\"")

        if not transcript or not transcript.strip():
            logger.info("[Orchestrator] Empty audio transcript received.")
            return AgentProcessResponse(
                transcript="No speech detected",
                intent="unknown",
                detected_meal=None,
                detected_meals=[],
                detected_workout=None,
                clarifications=[],
                insights=["No clear speech was detected in that recording. Please hold the mic and speak your meal or workout!"],
                status="success",
                navigation_date=date.today(),
                operation_performed="none"
            )

        target_date = resolve_target_date(transcript)
        date_label = "today" if target_date == date.today() else ("yesterday" if target_date == date.today() - timedelta(days=1) else target_date.strftime("%b %d"))

        profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        dietary_pref = profile.dietary_preference if profile else "vegetarian"
        user_weight = profile.weight_kg if profile and profile.weight_kg else 70.0
        user_memory = memory_agent.get_user_context(db)

        # 1. Intent Detection
        intent = intent_agent.parse_intent(transcript)
        logger.info(f"[IntentAgent] Resolved intent: \"{intent}\" for target_date={target_date}")
        
        detected_meals: List[MealLogCreate] = []
        detected_meal: Optional[MealLogCreate] = None
        detected_workout: Optional[WorkoutLogCreate] = None
        clarifications = []
        insights = []
        operation_performed = "none"

        # 2. Historical Query Handling (e.g. "What did I eat yesterday?", "Show me Friday's workout")
        if intent == "query_history":
            logger.info(f"[Orchestrator] Executing historical query for date={target_date}")
            past_meals = db.query(MealLog).filter(MealLog.log_date == target_date).all()
            past_workouts = db.query(WorkoutLog).filter(WorkoutLog.log_date == target_date).all()

            cals_consumed = sum(m.calories for m in past_meals)
            cals_burned = sum(w.calories_burned for w in past_workouts)
            protein_total = sum(m.protein_g for m in past_meals)

            if past_meals or past_workouts:
                meal_names = ", ".join([m.meal_title for m in past_meals]) if past_meals else "no meals"
                workout_names = ", ".join([w.exercise_name for w in past_workouts]) if past_workouts else "no workouts"
                insights.append(
                    f"📅 On {date_label.capitalize()}, you logged {cals_consumed:.0f} kcal ({protein_total:.0f}g Protein) "
                    f"across [{meal_names}] and burned {cals_burned:.0f} kcal with [{workout_names}]."
                )
            else:
                insights.append(f"📅 No logs found for {date_label}. Switched dashboard view to {target_date.strftime('%B %d, %Y')}.")

            return AgentProcessResponse(
                transcript=transcript,
                intent="query_history",
                detected_meal=None,
                detected_meals=[],
                detected_workout=None,
                clarifications=[],
                insights=insights,
                status="success",
                navigation_date=target_date,
                operation_performed="queried"
            )

        # 3. Voice Mutation & Editing Handling (e.g. "Update yesterday's lunch: change 2 rotis to 3 rotis and remove dal")
        if intent == "mutation":
            logger.info(f"[Orchestrator] Executing voice mutation for date={target_date}")
            
            # Prompt Gemini to structure the mutation action
            system_instruction = (
                "You are an AI Database Mutation Engine for Calora AI. "
                "Analyze the user's edit/update/delete request and output JSON with schema:\n"
                "{\n"
                "  'action': 'update' | 'delete',\n"
                "  'entity_type': 'meal' | 'workout',\n"
                "  'meal_type': 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all',\n"
                "  'search_keywords': string (keywords to match existing log title/items),\n"
                "  'updated_instruction': string (the full new text description of the updated meal/workout)\n"
                "}"
            )
            prompt = f"User mutation command: '{transcript}'. Target date: {target_date}."
            mutation_info = gemini_service.generate_json_response(prompt, system_instruction)

            if not mutation_info:
                # Local fallback rule extractor (offline resilience)
                t_lower = transcript.lower()
                action_fallback = "delete" if any(w in t_lower for w in ["delete", "remove", "cancel"]) else "update"
                entity_fallback = "workout" if any(w in t_lower for w in ["workout", "exercise", "running", "jog", "walk", "gym", "cardio"]) else "meal"
                
                if "breakfast" in t_lower:
                    m_type_fallback = "breakfast"
                elif "dinner" in t_lower or "night" in t_lower:
                    m_type_fallback = "dinner"
                elif "snack" in t_lower:
                    m_type_fallback = "snack"
                else:
                    m_type_fallback = "lunch"
                
                mutation_info = {
                    "action": action_fallback,
                    "entity_type": entity_fallback,
                    "meal_type": m_type_fallback,
                    "updated_instruction": transcript
                }

            if mutation_info:
                action = mutation_info.get("action", "update")
                entity_type = mutation_info.get("entity_type", "meal")
                m_type = mutation_info.get("meal_type", "lunch")
                updated_desc = mutation_info.get("updated_instruction", transcript)

                if entity_type == "meal":
                    query = db.query(MealLog).filter(MealLog.log_date == target_date)
                    if m_type and m_type != "all":
                        query = query.filter(MealLog.meal_type == m_type)
                    target_meal_obj = query.order_by(MealLog.created_at.desc()).first()

                    if not target_meal_obj:
                        # If not found by type, match latest on that day
                        target_meal_obj = db.query(MealLog).filter(MealLog.log_date == target_date).order_by(MealLog.created_at.desc()).first()

                    if target_meal_obj:
                        if action == "delete":
                            deleted_title = target_meal_obj.meal_title
                            db.delete(target_meal_obj)
                            db.commit()
                            insights.append(f"🗑️ Deleted {date_label}'s meal: '{deleted_title}'.")
                            operation_performed = "deleted"
                        else:
                            # Update in place with new parsed nutrition
                            recalc_meals, _ = nutrition_agent.parse_meal(
                                text=updated_desc,
                                user_preference=dietary_pref,
                                user_memory=user_memory
                            )
                            if recalc_meals:
                                new_m = recalc_meals[0]
                                target_meal_obj.meal_title = new_m.meal_title
                                target_meal_obj.items_json = json.dumps([i.model_dump() for i in new_m.items])
                                target_meal_obj.calories = new_m.calories
                                target_meal_obj.protein_g = new_m.protein_g
                                target_meal_obj.carbs_g = new_m.carbs_g
                                target_meal_obj.fat_g = new_m.fat_g
                                target_meal_obj.fiber_g = new_m.fiber_g
                                db.commit()
                                db.refresh(target_meal_obj)
                                insights.append(f"✏️ Updated {date_label}'s {target_meal_obj.meal_type}: '{new_m.meal_title}' ({new_m.calories} kcal, {new_m.protein_g}g Protein).")
                                operation_performed = "updated"
                    else:
                        insights.append(f"Couldn't find an existing meal on {date_label} to modify. Logging as a new entry instead.")
                        intent = "meal" # Fallback to new meal log

                elif entity_type == "workout":
                    target_workout_obj = db.query(WorkoutLog).filter(WorkoutLog.log_date == target_date).order_by(WorkoutLog.created_at.desc()).first()
                    if target_workout_obj:
                        if action == "delete":
                            deleted_name = target_workout_obj.exercise_name
                            db.delete(target_workout_obj)
                            db.commit()
                            insights.append(f"🗑️ Deleted {date_label}'s workout: '{deleted_name}'.")
                            operation_performed = "deleted"
                        else:
                            recalc_w, _ = workout_agent.parse_workout(text=updated_desc, user_weight_kg=user_weight, user_memory=user_memory)
                            target_workout_obj.exercise_name = recalc_w.exercise_name
                            target_workout_obj.duration_minutes = recalc_w.duration_minutes
                            target_workout_obj.calories_burned = recalc_w.calories_burned
                            target_workout_obj.intensity = recalc_w.intensity
                            db.commit()
                            db.refresh(target_workout_obj)
                            insights.append(f"✏️ Updated {date_label}'s workout: '{recalc_w.exercise_name}' ({recalc_w.calories_burned} kcal).")
                            operation_performed = "updated"

            if operation_performed in ["updated", "deleted"]:
                return AgentProcessResponse(
                    transcript=transcript,
                    intent="mutation",
                    detected_meal=None,
                    detected_meals=[],
                    detected_workout=None,
                    clarifications=[],
                    insights=insights,
                    status="success",
                    navigation_date=target_date,
                    operation_performed=operation_performed
                )

        # 4. Standard Nutrition Pipeline (Supports Date Backdating)
        if intent in ["meal", "both"]:
            logger.info(f"[NutritionAgent] Analyzing ingredients for date={target_date}...")
            detected_meals, inline_clarifications = nutrition_agent.parse_meal(
                text=transcript,
                user_preference=dietary_pref,
                user_memory=user_memory
            )

            if detected_meals:
                detected_meal = detected_meals[0]
                for idx, dm in enumerate(detected_meals, 1):
                    dm.log_date = target_date # Assign resolved date
                    logger.info(
                        f"[NutritionAgent] Meal #{idx} parsed: title=\"{dm.meal_title}\", "
                        f"date={target_date}, calories={dm.calories} kcal, protein={dm.protein_g}g"
                    )
            
            # Single-Pass Clarification Resolution
            if inline_clarifications:
                clarifications.extend(inline_clarifications)
            elif detected_meal:
                ai_clarifications = clarification_agent.check_ambiguities(
                    transcript=transcript,
                    parsed_meal=detected_meal,
                    user_memory=user_memory
                )
                if ai_clarifications:
                    clarifications.extend(ai_clarifications)

            # Pre-Log Protection
            if auto_save and detected_meals:
                if len(clarifications) == 0:
                    for dm in detected_meals:
                        db_meal = MealLog(
                            meal_type=dm.meal_type,
                            meal_title=dm.meal_title,
                            raw_transcript=transcript,
                            items_json=json.dumps([item.model_dump() for item in dm.items]),
                            calories=dm.calories,
                            protein_g=dm.protein_g,
                            carbs_g=dm.carbs_g,
                            fat_g=dm.fat_g,
                            fiber_g=dm.fiber_g,
                            assumptions_json=json.dumps(dm.assumptions),
                            is_confirmed=True,
                            log_date=target_date
                        )
                        db.add(db_meal)
                        db.commit()
                        logger.info(f"[Database] Persisted meal record id={db_meal.id} for date={target_date}")
                        insights.append(f"Logged {dm.meal_type.capitalize()} for {date_label.capitalize()}: {dm.meal_title} ({dm.calories} kcal, {dm.protein_g}g Protein)")
                        operation_performed = "created"
                else:
                    meal_name = detected_meal.meal_title if detected_meal else "your meal"
                    insights.append(f"Please confirm preparation details below to finalize and log {meal_name} for {date_label}.")

        # 5. Standard Workout Pipeline (Supports Date Backdating)
        if intent in ["workout", "both"]:
            logger.info(f"[WorkoutAgent] Parsing exercise for date={target_date}...")
            detected_workout, inline_workout_clarifications = workout_agent.parse_workout(
                text=transcript,
                user_weight_kg=user_weight,
                user_memory=user_memory
            )
            if detected_workout:
                detected_workout.log_date = target_date

            if inline_workout_clarifications:
                clarifications.extend(inline_workout_clarifications)
            else:
                workout_clarifications = clarification_agent.check_ambiguities(
                    transcript=transcript,
                    parsed_workout=detected_workout,
                    user_memory=user_memory
                )
                if workout_clarifications:
                    clarifications.extend(workout_clarifications)

            if auto_save and detected_workout:
                if len(clarifications) == 0:
                    db_workout = WorkoutLog(
                        exercise_name=detected_workout.exercise_name,
                        workout_category=detected_workout.workout_category,
                        duration_minutes=detected_workout.duration_minutes,
                        intensity=detected_workout.intensity,
                        calories_burned=detected_workout.calories_burned,
                        muscle_groups=detected_workout.muscle_groups,
                        notes=detected_workout.notes,
                        log_date=target_date
                    )
                    db.add(db_workout)
                    db.commit()
                    logger.info(f"[Database] Persisted workout record id={db_workout.id} for date={target_date}")
                    insights.append(f"Recorded {detected_workout.exercise_name} for {date_label.capitalize()} ({detected_workout.calories_burned} kcal burned)")
                    operation_performed = "created"
                else:
                    insights.append(f"Please confirm workout details below to finalize {detected_workout.exercise_name} for {date_label}.")

        # 6. Proactive Advice & Unknown Handling
        if intent == "advice":
            insights.append("Looking at your macros, adding 20g protein for dinner will keep you perfectly on track for your body composition goal.")
        elif intent == "unknown":
            insights.append("I couldn't detect a meal, workout, or edit command in that note. Try saying: 'I had 2 rotis with dal' or 'Change yesterday's lunch to 3 rotis'!")

        return AgentProcessResponse(
            transcript=transcript,
            intent=intent,
            detected_meal=detected_meal,
            detected_meals=detected_meals,
            detected_workout=detected_workout,
            clarifications=clarifications,
            insights=insights,
            status="success",
            navigation_date=target_date,
            operation_performed=operation_performed
        )

orchestrator = MasterOrchestratorAgent()
