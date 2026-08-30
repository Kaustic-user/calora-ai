import re
import logging
from typing import Dict, Any, Tuple, List, Optional
from app.services.gemini_service import gemini_service
from app.schemas.schemas import WorkoutLogCreate, ClarificationItem

logger = logging.getLogger("CaloraAI.WorkoutAgent")

class WorkoutAgent:
    MET_VALUES = {
        "running": 9.8,
        "jogging": 7.0,
        "walking": 3.8,
        "cycling": 7.5,
        "swimming": 8.0,
        "strength": 5.0,
        "weightlifting": 5.5,
        "yoga": 3.0,
        "hiit": 8.5,
        "badminton": 5.5,
        "cricket": 4.8
    }

    def parse_workout(
        self, 
        text: str, 
        user_weight_kg: float = 70.0,
        user_memory: Optional[Dict[str, Any]] = None
    ) -> Tuple[WorkoutLogCreate, List[ClarificationItem]]:
        """Parses exercise voice/text, calculates MET calories, and flags ambiguities (e.g. missing duration, intensity)"""
        
        memory_str = ""
        if user_memory and user_memory.get("habits"):
            memory_str = f"Known user habits: {', '.join(user_memory['habits'])}."

        system_instruction = (
            "You are an expert Exercise Physiology Agent. Parse the user's workout log into structured fields. "
            "Calculate realistic metabolic calorie expenditure using MET values. "
            "\n"
            "AMBIGUITY CHECK:\n"
            "If duration, exercise intensity, or critical variables (e.g. weighted vs bodyweight pullups, incline vs flat walk) "
            "are omitted from the input, generate a clarification question with 3-4 clickable options and state the assumed default. "
            "\n"
            "Output JSON with this schema:\n"
            "{\n"
            "  'exercise_name': string (e.g. 'Outdoor Running', 'Bench Press & Chest Workout'),\n"
            "  'workout_category': 'strength' | 'cardio' | 'yoga' | 'sports' | 'hiit',\n"
            "  'duration_minutes': int (e.g. 30),\n"
            "  'intensity': 'low' | 'moderate' | 'high',\n"
            "  'muscle_groups': string (e.g. 'Quadriceps, Hamstrings, Core'),\n"
            "  'notes': string,\n"
            "  'clarifications': [\n"
            "    {\n"
            "      'id': string (e.g. 'running_duration', 'pullup_style'),\n"
            "      'question': string (e.g. 'How long did you run for?'),\n"
            "      'assumed_value': string (e.g. '30 Minutes (Default)'),\n"
            "      'options': [string] (e.g. ['15 Mins', '30 Mins (Default)', '45 Mins', '60 Mins'])\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        prompt = f"User logged workout: '{text}'. User weight: {user_weight_kg}kg. {memory_str}"
        llm_result = gemini_service.generate_json_response(prompt, system_instruction)

        clarifications: List[ClarificationItem] = []

        if llm_result and "exercise_name" in llm_result:
            exercise_name = llm_result.get("exercise_name", "Workout Session")
            category = llm_result.get("workout_category", "strength")
            duration = int(llm_result.get("duration_minutes", 30))
            intensity = llm_result.get("intensity", "moderate")
            muscle_groups = llm_result.get("muscle_groups", "Full Body")
            notes = llm_result.get("notes", f"Logged: {text}")

            for raw_c in llm_result.get("clarifications", []):
                if "question" in raw_c and "options" in raw_c and len(raw_c["options"]) > 0:
                    clarifications.append(ClarificationItem(
                        id=raw_c.get("id", f"workout_clarify_{len(clarifications)}"),
                        question=raw_c.get("question"),
                        assumed_value=raw_c.get("assumed_value", "Standard Default"),
                        options=raw_c.get("options", [])
                    ))
        else:
            # Fallback deterministic parsing
            text_lower = text.lower()
            
            # Duration extraction
            dur_match = re.search(r'(\d+)\s*(?:min|mins|minute|minutes|hr|hrs|hour|hours)', text_lower)
            if dur_match:
                duration = int(dur_match.group(1))
                if "hr" in dur_match.group(0) or "hour" in dur_match.group(0):
                    duration *= 60
            else:
                duration = 30
                clarifications.append(ClarificationItem(
                    id="workout_duration",
                    question="How long was your workout session?",
                    assumed_value="30 Minutes (~Default)",
                    options=["15 Mins", "30 Mins (Default)", "45 Mins", "60 Mins"]
                ))

            # Exercise detection with past-tense support
            if any(k in text_lower for k in ["run", "ran", "running", "jog", "jogged", "sprint"]):
                exercise_name = "Outdoor Running"
                category = "cardio"
                muscle_groups = "Legs & Cardiovascular"
            elif any(k in text_lower for k in ["walk", "walked", "walking", "step", "steps"]):
                exercise_name = "Brisk Walking"
                category = "cardio"
                muscle_groups = "Legs & Core"
            elif any(k in text_lower for k in ["bench press", "chest", "pushup", "pushups", "dip", "dips"]):
                exercise_name = "Chest & Upper Body Strength"
                category = "strength"
                muscle_groups = "Chest, Shoulders, Triceps"
            elif any(k in text_lower for k in ["squat", "squats", "leg", "legs", "lunge"]):
                exercise_name = "Leg Day Workout"
                category = "strength"
                muscle_groups = "Quadriceps, Glutes, Hamstrings"
            elif any(k in text_lower for k in ["yoga", "stretch", "stretching", "pilates"]):
                exercise_name = "Vinyasa Yoga Flow"
                category = "yoga"
                muscle_groups = "Core, Flexibility, Full Body"
            elif any(k in text_lower for k in ["cycle", "cycling", "cycled", "bike", "biking"]):
                exercise_name = "Cycling / Spin Session"
                category = "cardio"
                muscle_groups = "Quadriceps & Calves"
            elif any(k in text_lower for k in ["swim", "swimming", "swam"]):
                exercise_name = "Swimming Session"
                category = "cardio"
                muscle_groups = "Full Body & Lats"
            else:
                exercise_name = "General Gym Workout"
                category = "strength"
                muscle_groups = "Full Body"

            intensity = "high" if any(k in text_lower for k in ["heavy", "intense", "hiit", "hard"]) else "moderate"
            notes = f"Logged via voice: {text}"

        # MET calculation: Calories = MET * Weight(kg) * (Duration_min / 60)
        base_met = self.MET_VALUES.get(category, 5.0)
        if intensity == "high":
            base_met *= 1.25
        elif intensity == "low":
            base_met *= 0.8

        calories_burned = round(base_met * user_weight_kg * (duration / 60.0), 1)

        workout = WorkoutLogCreate(
            exercise_name=exercise_name,
            workout_category=category,
            duration_minutes=duration,
            intensity=intensity,
            calories_burned=calories_burned,
            muscle_groups=muscle_groups,
            notes=notes
        )

        return workout, clarifications

workout_agent = WorkoutAgent()
