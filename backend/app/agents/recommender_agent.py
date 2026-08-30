import time
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.schemas import MealRecommendationOption
from app.services.gemini_service import gemini_service

logger = logging.getLogger("CaloraAI.RecommenderAgent")

class RecommenderAgent:
    """
    AI-Powered Context-Aware Meal Recommender with TTL Caching & 6-Model Failover.
    Dynamically generates personalized meals tailored to exact remaining macros,
    dietary preferences, time-of-day, user habits, and today's meal history (to ensure variety).
    """

    OFFLINE_RECS_DB = [
        {
            "title": "Paneer Bhurji & Multigrain Phulkas",
            "description": "High-protein scrambled cottage cheese with bell peppers and 2 dry phulkas.",
            "calories": 420.0,
            "protein_g": 24.0,
            "carbs_g": 38.0,
            "fat_g": 18.0,
            "fiber_g": 6.0,
            "items": ["150g Fresh Paneer", "2 Dry Phulkas", "1 cup Veggie salad"],
            "time_to_cook": "15 mins",
            "dietary": "vegetarian"
        },
        {
            "title": "Soya Chunks Masala & Jeera Rice",
            "description": "Plant-powered protein bomb with rich spiced gravy and fragrant jeera rice.",
            "calories": 410.0,
            "protein_g": 28.0,
            "carbs_g": 48.0,
            "fat_g": 8.0,
            "fiber_g": 8.0,
            "items": ["50g Dry Soya Chunks (cooked)", "1 katori Jeera Rice", "Cucumber Raita"],
            "time_to_cook": "20 mins",
            "dietary": "vegan"
        },
        {
            "title": "Sprouted Moong Chaat & Boiled Eggs",
            "description": "Crisp sprouted lentils with pomegranate, lemon, herbs and 2 hard boiled eggs.",
            "calories": 310.0,
            "protein_g": 22.0,
            "carbs_g": 28.0,
            "fat_g": 11.0,
            "fiber_g": 7.0,
            "items": ["1.5 katori Sprouted Moong", "2 Boiled Eggs", "Lemon & Chaat Masala"],
            "time_to_cook": "5 mins",
            "dietary": "eggetarian"
        },
        {
            "title": "Grilled Chicken Tikka & Mint Chutney",
            "description": "Lean spiced chicken breast skewers with fresh coriander mint yogurt dip.",
            "calories": 380.0,
            "protein_g": 36.0,
            "carbs_g": 8.0,
            "fat_g": 12.0,
            "fiber_g": 2.0,
            "items": ["180g Chicken Breast", "2 tbsp Mint Chutney", "Kachumber Salad"],
            "time_to_cook": "20 mins",
            "dietary": "non_vegetarian"
        },
        {
            "title": "Moong Dal Cheela with Mint Curd",
            "description": "Savory lentil crepes stuffed with grated paneer and herbs.",
            "calories": 350.0,
            "protein_g": 20.0,
            "carbs_g": 32.0,
            "fat_g": 14.0,
            "fiber_g": 5.5,
            "items": ["2 Moong Dal Cheelas", "50g Grated Paneer filling", "1/2 cup Curd"],
            "time_to_cook": "15 mins",
            "dietary": "vegetarian"
        },
        {
            "title": "Tofu & Broccoli Sesame Stir-Fry",
            "description": "Crisp golden tofu cubes tossed with broccoli florets, bell peppers, and toasted sesame.",
            "calories": 320.0,
            "protein_g": 21.0,
            "carbs_g": 18.0,
            "fat_g": 14.0,
            "fiber_g": 6.0,
            "items": ["180g Firm Tofu", "1 bowl Steamed Broccoli & Peppers", "Sesame Oil dressing"],
            "time_to_cook": "12 mins",
            "dietary": "vegan"
        }
    ]

    def __init__(self):
        # In-memory recommendation cache with TTL (5 minutes)
        self._cache: Dict[str, Tuple[float, List[MealRecommendationOption]]] = {}
        self._ttl_seconds = 300.0

    def get_recommendations(
        self,
        remaining_calories: float,
        remaining_protein: float,
        remaining_carbs: float,
        remaining_fat: float,
        dietary_preference: str = "vegetarian",
        allergies: str = "",
        meals_eaten_today: List[str] = None,
        user_memory: Dict[str, Any] = None,
        filter_type: str = "",
        custom_filter: Optional[str] = None
    ) -> List[MealRecommendationOption]:
        """Synthesizes AI-tailored meal recommendations with caching and multi-model fallback"""

        active_filter = (custom_filter or filter_type or "").strip()

        current_hour = datetime.now().hour
        if current_hour < 11:
            time_context = "breakfast"
        elif current_hour < 16:
            time_context = "lunch"
        elif current_hour < 19:
            time_context = "evening snack"
        else:
            time_context = "dinner"

        # Safe defaults if target already met
        if remaining_calories <= 150:
            remaining_calories = 300.0
        if remaining_protein <= 5:
            remaining_protein = 20.0

        # Check in-memory cache to conserve Gemini API rate limits
        cache_bucket_cals = round(remaining_calories / 50)
        cache_bucket_prot = round(remaining_protein / 5)
        cache_key = f"{time_context}_{active_filter}_{cache_bucket_cals}_{cache_bucket_prot}_{dietary_preference}"
        
        now = time.time()
        if cache_key in self._cache:
            cached_time, cached_recs = self._cache[cache_key]
            if (now - cached_time) < self._ttl_seconds:
                logger.info(f"[RecommenderAgent] Returning cached meal recommendations for key='{cache_key}' (0 API quota used)")
                return cached_recs

        eaten_str = ""
        if meals_eaten_today and len(meals_eaten_today) > 0:
            eaten_str = f"Meals already eaten today by user: {', '.join(meals_eaten_today)}. Ensure your recommendations offer fresh variety and do NOT duplicate these exact dishes."

        habits_str = ""
        if user_memory and user_memory.get("habits"):
            habits_str = f"User food habits: {', '.join(user_memory['habits'])}."

        filter_str = ""
        if active_filter == "quick":
            filter_str = "Focus on quick meals that take under 15 minutes to prepare."
        elif active_filter == "high_protein":
            filter_str = "Maximize protein density (>30g protein)."
        elif active_filter == "light":
            filter_str = "Keep it light, high fiber, and easy to digest (<350 kcal)."

        system_instruction = (
            "You are an expert Clinical Sports Dietitian. Create exactly 3 diverse, appetizing meal options "
            "specifically engineered to help the user hit their exact remaining daily macro budget. "
            "Prioritize high satiety, high protein density, and realistic Indian/global home-cooking recipes. "
            "\n"
            "CRITICAL RULES:\n"
            f"1. Dietary Preference: Strictly adhere to '{dietary_preference}'. "
            f"Allergies: '{allergies if allergies else 'None'}'.\n"
            "2. Macro Accuracy: The recommended meals MUST be close to the remaining calorie and protein budget. "
            "Give exact portion sizes in grams or standard katoris/bowls.\n"
            "3. Variety: Avoid duplicating key protein sources already consumed today.\n"
            "4. Output strictly valid JSON."
        )

        prompt = (
            f"Generate 3 distinct meal recommendations for {time_context}.\n"
            f"REMAINING MACRO BUDGET:\n"
            f"- Calories: ~{round(remaining_calories)} kcal\n"
            f"- Protein: ~{round(remaining_protein, 1)}g\n"
            f"- Carbs: ~{round(remaining_carbs, 1)}g\n"
            f"- Fat: ~{round(remaining_fat, 1)}g\n\n"
            f"{eaten_str}\n{habits_str}\n{filter_str}\n\n"
            "Format JSON as:\n"
            "{\n"
            "  'recommendations': [\n"
            "    {\n"
            "      'title': string (e.g. 'Sautéed Paneer & Multigrain Phulka'),\n"
            "      'description': string (appetizing 1-sentence description),\n"
            "      'calories': float,\n"
            "      'protein_g': float,\n"
            "      'carbs_g': float,\n"
            "      'fat_g': float,\n"
            "      'fiber_g': float,\n"
            "      'items': [string] (e.g. ['150g Paneer', '2 Phulkas', 'Kachumber Salad']),\n"
            "      'time_to_cook': string (e.g. '15 mins'),\n"
            "      'dietary': string ('vegetarian' | 'vegan' | 'eggetarian' | 'non_vegetarian' | 'jain')\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        logger.info(f"[RecommenderAgent] Synthesizing AI meals for {time_context} (budget: {round(remaining_calories)} kcal, {round(remaining_protein, 1)}g protein)...")
        llm_result = gemini_service.generate_json_response(prompt, system_instruction)

        if llm_result and "recommendations" in llm_result and len(llm_result["recommendations"]) > 0:
            recs = []
            for r in llm_result["recommendations"]:
                try:
                    recs.append(MealRecommendationOption(
                        title=r.get("title", "Custom Macro Meal"),
                        description=r.get("description", "High protein balanced meal option."),
                        calories=float(r.get("calories", round(remaining_calories, 1))),
                        protein_g=float(r.get("protein_g", round(remaining_protein, 1))),
                        carbs_g=float(r.get("carbs_g", round(remaining_carbs, 1))),
                        fat_g=float(r.get("fat_g", round(remaining_fat, 1))),
                        fiber_g=float(r.get("fiber_g", 5.0)),
                        items=r.get("items", []),
                        time_to_cook=r.get("time_to_cook", "15 mins"),
                        dietary=r.get("dietary", dietary_preference)
                    ))
                except Exception as parse_err:
                    logger.warning(f"[RecommenderAgent] Failed to parse item: {parse_err}")
            if len(recs) > 0:
                logger.info(f"[RecommenderAgent] Successfully synthesized {len(recs)} dynamic AI meal recommendations.")
                final_recs = recs[:3]
                self._cache[cache_key] = (now, final_recs)
                return final_recs

        # Resilient Offline Fallback
        logger.info("[RecommenderAgent] Using curated offline fallback recommendations.")
        valid_recs = []
        for rec in self.OFFLINE_RECS_DB:
            if dietary_preference == "vegan" and rec["dietary"] != "vegan":
                continue
            if dietary_preference == "vegetarian" and rec["dietary"] in ["non_vegetarian", "eggetarian"]:
                continue
            if dietary_preference == "eggetarian" and rec["dietary"] == "non_vegetarian":
                continue
            valid_recs.append(rec)

        if not valid_recs:
            valid_recs = self.OFFLINE_RECS_DB[:3]

        fallback_recs = [MealRecommendationOption(**r) for r in valid_recs[:3]]
        self._cache[cache_key] = (now, fallback_recs)
        return fallback_recs

recommender_agent = RecommenderAgent()
