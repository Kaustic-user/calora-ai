import logging
from typing import List, Dict, Any, Optional
from app.schemas.schemas import ClarificationItem, MealLogCreate, WorkoutLogCreate
from app.services.gemini_service import gemini_service

logger = logging.getLogger("CaloraAI.ClarificationAgent")

class ClarificationAgent:
    def check_ambiguities(
        self, 
        transcript: str, 
        parsed_meal: Optional[MealLogCreate] = None,
        parsed_workout: Optional[WorkoutLogCreate] = None,
        user_memory: Optional[Dict[str, Any]] = None
    ) -> List[ClarificationItem]:
        """
        Uses Gemini LLM to analyze the user's transcript and parsed event.
        Detects high-impact ambiguous variables (>15% calorie delta) and generates
        actionable 1-tap confirmation prompts.
        """
        
        memory_str = ""
        if user_memory and user_memory.get("habits"):
            memory_str = f"Known user habits/preferences: {', '.join(user_memory['habits'])}."

        event_summary = ""
        if parsed_meal:
            items_str = ", ".join([f"{i.portion} {i.name}" for i in parsed_meal.items])
            event_summary = f"Parsed Meal: {parsed_meal.meal_title} ({parsed_meal.calories} kcal) with items: [{items_str}]."
        elif parsed_workout:
            event_summary = f"Parsed Workout: {parsed_workout.exercise_name} ({parsed_workout.duration_minutes} mins, {parsed_workout.calories_burned} kcal)."

        system_instruction = (
            "You are an AI Ambiguity & Clarification Agent for a fitness tracking application. "
            "Your job is to examine what the user spoke and what was parsed, and check if any critical detail was omitted. "
            "\n"
            "GUIDELINES:\n"
            "1. Only flag ambiguities that could change the total calories/macros by >15% "
            "(e.g. oil/ghee amount, sugar/sweeteners in drinks, creamy vs clear dressings, fried vs grilled, cut of meat, weighted vs bodyweight exercise).\n"
            "2. Do NOT ask trivial questions if the input was already explicit or clear.\n"
            "3. If an ambiguity exists, formulate a clear, concise question, state the assumed default value used in the calculation, "
            "and provide 3 to 4 short clickable alternative options.\n"
            "\n"
            "Output JSON with this exact structure:\n"
            "{\n"
            "  'clarifications': [\n"
            "    {\n"
            "      'id': string (e.g. 'beverage_sugar', 'salad_dressing', 'roti_ghee', 'meat_cut'),\n"
            "      'question': string (e.g. 'Did your coffee have added sugar?'),\n"
            "      'assumed_value': string (e.g. '1 tsp Sugar (~25 kcal)'),\n"
            "      'options': [string] (e.g. ['1 tsp Sugar (Default)', 'No Sugar (Black)', '2+ tsp Sugar', 'Jaggery / Honey'])\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        prompt = (
            f"User spoken input: '{transcript}'\n"
            f"{event_summary}\n"
            f"{memory_str}\n"
            "Determine if any high-impact nutritional or workout ambiguity exists."
        )

        logger.info("[ClarificationAgent] Invoking Gemini LLM for dynamic ambiguity detection...")
        llm_result = gemini_service.generate_json_response(prompt, system_instruction)

        clarifications: List[ClarificationItem] = []

        if llm_result and "clarifications" in llm_result:
            for item in llm_result.get("clarifications", []):
                if item.get("question") and item.get("options"):
                    clarifications.append(ClarificationItem(
                        id=str(item.get("id", f"clarify_{len(clarifications)}")),
                        question=str(item.get("question")),
                        assumed_value=str(item.get("assumed_value", "Default Assumption")),
                        options=[str(opt) for opt in item.get("options", [])]
                    ))
            logger.info(f"[ClarificationAgent] Gemini generated {len(clarifications)} dynamic ambiguity question(s)")

        return clarifications

clarification_agent = ClarificationAgent()
