import json
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from app.agents.intent_agent import intent_agent
from app.agents.nutrition_agent import nutrition_agent
from app.agents.workout_agent import workout_agent
from app.agents.clarification_agent import clarification_agent
from app.agents.memory_agent import memory_agent
from app.schemas.schemas import AgentProcessResponse, MealLogCreate, WorkoutLogCreate
from app.db.models import MealLog, WorkoutLog, UserProfile

logger = logging.getLogger("CaloraAI.Orchestrator")

class MasterOrchestratorAgent:
    def process_voice_transcript(
        self, 
        transcript: str, 
        db: Session, 
        user_id: int = 1,
        auto_save: bool = True
    ) -> AgentProcessResponse:
        """Coordinates multi-agent pipeline and returns structured payload"""
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
                status="success"
            )

        profile = db.query(UserProfile).filter(UserProfile.id == user_id).first()
        dietary_pref = profile.dietary_preference if profile else "vegetarian"
        user_weight = profile.weight_kg if profile and profile.weight_kg else 70.0
        user_memory = memory_agent.get_user_context(db)

        # 1. Intent Detection
        intent = intent_agent.parse_intent(transcript)
        logger.info(f"[IntentAgent] Resolved intent: \"{intent}\"")
        
        detected_meals: List[MealLogCreate] = []
        detected_meal: Optional[MealLogCreate] = None
        detected_workout: Optional[WorkoutLogCreate] = None
        clarifications = []
        insights = []

        # 2. Nutrition Pipeline
        if intent in ["meal", "both"]:
            logger.info("[NutritionAgent] Analyzing ingredients, portions, and macronutrients via Gemini...")
            detected_meals, inline_clarifications = nutrition_agent.parse_meal(
                text=transcript,
                user_preference=dietary_pref,
                user_memory=user_memory
            )

            if detected_meals:
                detected_meal = detected_meals[0]
                for idx, dm in enumerate(detected_meals, 1):
                    logger.info(
                        f"[NutritionAgent] Meal #{idx} parsed: title=\"{dm.meal_title}\", "
                        f"type={dm.meal_type}, calories={dm.calories} kcal, protein={dm.protein_g}g, "
                        f"carbs={dm.carbs_g}g, fat={dm.fat_g}g"
                    )
            
            # 3. Single-Pass Clarification Resolution (Zero Redundant Round-Trips)
            if inline_clarifications:
                logger.info(f"[Orchestrator] Using {len(inline_clarifications)} inline clarification(s) from single-pass nutrition output.")
                clarifications.extend(inline_clarifications)
            elif detected_meal:
                logger.info("[Orchestrator] No inline clarifications found. Verifying via ClarificationAgent if needed...")
                ai_clarifications = clarification_agent.check_ambiguities(
                    transcript=transcript,
                    parsed_meal=detected_meal,
                    user_memory=user_memory
                )
                if ai_clarifications:
                    clarifications.extend(ai_clarifications)

            # Pre-Log Protection: Auto-save only if NO ambiguous high-impact clarifications exist
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
                            is_confirmed=True
                        )
                        db.add(db_meal)
                        db.commit()
                        logger.info(f"[Database] Persisted meal record id={db_meal.id} ({dm.meal_title}) into 'meal_logs'")
                        insights.append(f"Logged {dm.meal_type.capitalize()}: {dm.meal_title} ({dm.calories} kcal, {dm.protein_g}g Protein)")
                else:
                    logger.info(f"[Orchestrator] Holding {len(detected_meals)} meal(s) in pending state awaiting user clarification confirmation.")
                    meal_name = detected_meal.meal_title if detected_meal else "your meal"
                    insights.append(f"Please confirm preparation details below to finalize and log {meal_name}.")

        # 4. Workout Pipeline
        if intent in ["workout", "both"]:
            logger.info("[WorkoutAgent] Parsing exercise category, duration, and metabolic expenditure...")
            detected_workout, inline_workout_clarifications = workout_agent.parse_workout(
                text=transcript,
                user_weight_kg=user_weight,
                user_memory=user_memory
            )
            logger.info(
                f"[WorkoutAgent] Workout parsed: name=\"{detected_workout.exercise_name}\", "
                f"duration={detected_workout.duration_minutes} mins, "
                f"calories_burned={detected_workout.calories_burned} kcal"
            )
            
            # Use inline workout clarifications or verify via ClarificationAgent
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

            # Pre-Log Protection: Auto-save ONLY if no pending ambiguities exist
            if auto_save and detected_workout:
                if len(clarifications) == 0:
                    db_workout = WorkoutLog(
                        exercise_name=detected_workout.exercise_name,
                        workout_category=detected_workout.workout_category,
                        duration_minutes=detected_workout.duration_minutes,
                        intensity=detected_workout.intensity,
                        calories_burned=detected_workout.calories_burned,
                        muscle_groups=detected_workout.muscle_groups,
                        notes=detected_workout.notes
                    )
                    db.add(db_workout)
                    db.commit()
                    logger.info(f"[Database] Persisted workout record id={db_workout.id} into database table 'workout_logs'")
                    insights.append(f"Recorded {detected_workout.exercise_name} ({detected_workout.calories_burned} kcal burned)")
                else:
                    logger.info(f"[Orchestrator] Holding workout '{detected_workout.exercise_name}' in pending state awaiting user clarification confirmation.")
                    insights.append(f"Please confirm workout details below to finalize {detected_workout.exercise_name}.")

        # 5. Proactive Advice & Unknown Handling
        if intent == "advice":
            insights.append("Looking at your daily macros, adding 20g protein for dinner will keep you perfectly on track for your body composition goal.")
        elif intent == "unknown":
            logger.info("[Orchestrator] Intent is unknown. Generating user guidance tip.")
            insights.append("I couldn't detect a meal or workout in that note. Try saying: 'I had 2 rotis with dal' or 'Did a 30 min run'!")

        return AgentProcessResponse(
            transcript=transcript,
            intent=intent,
            detected_meal=detected_meal,
            detected_meals=detected_meals,
            detected_workout=detected_workout,
            clarifications=clarifications,
            insights=insights,
            status="success"
        )

orchestrator = MasterOrchestratorAgent()
