import re
import logging
from typing import Dict, Any, List, Tuple
from app.services.gemini_service import gemini_service
from app.schemas.schemas import MealLogCreate, FoodItemBreakdown, ClarificationItem

logger = logging.getLogger("CaloraAI.NutritionAgent")

class NutritionAgent:
    def parse_meal(
        self, 
        text: str, 
        user_preference: str = "vegetarian",
        user_memory: Dict[str, Any] = None
    ) -> Tuple[List[MealLogCreate], List[ClarificationItem]]:
        """
        Parses voice/text input into one or more structured meals (Multi-Meal Segmentation),
        macronutrients, and dynamic AI clarification cards.
        """
        
        memory_context = ""
        if user_memory and user_memory.get("habits"):
            memory_context = f"Known user habits: {', '.join(user_memory['habits'])}."

        system_instruction = (
            "You are an expert Clinical Nutritionist Agent with deep understanding of Indian and global cuisine. "
            "Analyze the user's spoken meal log, break it down into individual dishes/ingredients, and calculate accurate macronutrients. "
            "Factor in realistic domestic preparation methods (e.g., ghee on rotis, tadka oil, sugar in tea/coffee, standard katori/bowl portion sizes). "
            "\n"
            "MULTI-MEAL SEGMENTATION INSTRUCTION:\n"
            "If the user describes multiple distinct meals eaten throughout the day (e.g. 'For breakfast I had oats, for lunch 2 rotis with dal, and for dinner paneer bhurji'), "
            "segment them into separate meal objects in the 'meals' array with their respective meal_type ('breakfast', 'lunch', 'dinner', 'snack'). "
            "If only one meal is described, return exactly 1 meal in the 'meals' array. "
            "\n"
            "AI CLARIFICATION ENGINE INSTRUCTION:\n"
            "Identify any high-impact hidden nutritional variables that are ambiguous in the user's input "
            "(e.g., cooking fats, added sugar in beverages, creamy vs clear dressings, preparation style). "
            "If an ambiguity could change a meal's calorie count by >15%, generate a concise question, state the assumed default value, and provide 3-4 clickable 1-tap quick options. "
            "\n"
            "Output JSON with this exact schema:\n"
            "{\n"
            "  'meals': [\n"
            "    {\n"
            "      'meal_title': string (e.g. 'Eggs & Toast', 'Dal Tadka with 2 Phulkas'),\n"
            "      'meal_type': 'breakfast' | 'lunch' | 'dinner' | 'snack',\n"
            "      'items': [\n"
            "        {\n"
            "          'name': string,\n"
            "          'portion': string (e.g. '2 Phulkas with Ghee', '1 Katori (150g)'),\n"
            "          'quantity': float,\n"
            "          'unit': string,\n"
            "          'calories': float,\n"
            "          'protein_g': float,\n"
            "          'carbs_g': float,\n"
            "          'fat_g': float,\n"
            "          'fiber_g': float\n"
            "        }\n"
            "      ],\n"
            "      'assumptions': [string] (e.g. 'Assumed 1 tsp ghee per roti', 'Assumed whole milk in tea')\n"
            "    }\n"
            "  ],\n"
            "  'clarifications': [\n"
            "    {\n"
            "      'id': string (e.g. 'tea_sugar_check', 'salad_dressing_type'),\n"
            "      'question': string (e.g. 'Did your chai have added sugar?'),\n"
            "      'assumed_value': string (e.g. '1 tsp Sugar (~25 kcal)'),\n"
            "      'options': [string] (e.g. ['1 tsp Sugar (Default)', 'No Sugar (Sugarfree)', '2+ tsp Sugar', 'Jaggery / Honey'])\n"
            "    }\n"
            "  ]\n"
            "}"
        )
        
        prompt = f"User logged: '{text}'. User dietary preference context: {user_preference}. {memory_context}"
        llm_result = gemini_service.generate_json_response(prompt, system_instruction)
        
        detected_meals: List[MealLogCreate] = []
        clarifications: List[ClarificationItem] = []

        if llm_result:
            # Handle both 'meals' array and fallback single meal object schema
            raw_meals = llm_result.get("meals", [])
            if not raw_meals and "items" in llm_result:
                raw_meals = [llm_result]

            for raw_m in raw_meals:
                m_title = raw_m.get("meal_title", "Healthy Meal")
                m_type = raw_m.get("meal_type", "lunch")
                m_assumptions = raw_m.get("assumptions", [])
                m_items: List[FoodItemBreakdown] = []

                for raw_item in raw_m.get("items", []):
                    name = str(raw_item.get("name", "Food Item"))
                    portion = str(raw_item.get("portion", f"{raw_item.get('quantity', 1)} {raw_item.get('unit', 'serving')}"))
                    qty = float(raw_item.get("quantity", 1.0))
                    unit = str(raw_item.get("unit", "piece"))
                    cals = float(raw_item.get("calories", 100.0))
                    prot = float(raw_item.get("protein_g", 3.0))
                    carbs = float(raw_item.get("carbs_g", 15.0))
                    fat = float(raw_item.get("fat_g", 2.0))
                    fiber = float(raw_item.get("fiber_g", 1.0))

                    m_items.append(FoodItemBreakdown(
                        name=name,
                        portion=portion,
                        quantity=qty,
                        unit=unit,
                        calories=round(cals, 1),
                        protein_g=round(prot, 1),
                        carbs_g=round(carbs, 1),
                        fat_g=round(fat, 1),
                        fiber_g=round(fiber, 1),
                        is_estimated=False,
                        source="gemini_llm_intelligence"
                    ))

                if m_items:
                    total_cals = round(sum(i.calories for i in m_items), 1)
                    total_prot = round(sum(i.protein_g for i in m_items), 1)
                    total_carbs = round(sum(i.carbs_g for i in m_items), 1)
                    total_fat = round(sum(i.fat_g for i in m_items), 1)
                    total_fiber = round(sum(i.fiber_g for i in m_items), 1)

                    detected_meals.append(MealLogCreate(
                        meal_type=m_type,
                        meal_title=m_title,
                        raw_transcript=text,
                        items=m_items,
                        calories=total_cals,
                        protein_g=total_prot,
                        carbs_g=total_carbs,
                        fat_g=total_fat,
                        fiber_g=total_fiber,
                        assumptions=m_assumptions
                    ))

            # Parse AI generated clarifications
            for raw_c in llm_result.get("clarifications", []):
                if "question" in raw_c and "options" in raw_c and len(raw_c["options"]) > 0:
                    clarifications.append(ClarificationItem(
                        id=raw_c.get("id", f"clarify_{len(clarifications)}"),
                        question=raw_c.get("question"),
                        assumed_value=raw_c.get("assumed_value", "Standard Default"),
                        options=raw_c.get("options", [])
                    ))
            if clarifications:
                logger.info(f"[NutritionAgent] AI generated {len(clarifications)} dynamic ambiguity question(s)")

        if not detected_meals:
            # Baseline deterministic fallback for offline / multi-meal parsing
            logger.info("[NutritionAgent] LLM offline. Using baseline fallback parser.")
            text_lower = text.lower()

            # Check if multi-period keywords exist
            has_bf = "breakfast" in text_lower or "morning" in text_lower
            has_lunch = "lunch" in text_lower or "afternoon" in text_lower
            has_dinner = "dinner" in text_lower or "night" in text_lower

            if (has_bf and (has_lunch or has_dinner)) or (has_lunch and has_dinner):
                logger.info("[NutritionAgent] Detected multi-meal period in voice transcript. Splitting periods...")
                
                # Breakfast segment
                if has_bf:
                    detected_meals.append(MealLogCreate(
                        meal_type="breakfast",
                        meal_title="Morning Breakfast Log",
                        raw_transcript=text,
                        items=[
                            FoodItemBreakdown(name="Oats / Eggs", portion="1 Bowl / 2 Eggs", quantity=1, unit="serving", calories=180.0, protein_g=12.0, carbs_g=20.0, fat_g=5.0, fiber_g=3.0, source="icmr_nin")
                        ],
                        calories=180.0,
                        protein_g=12.0,
                        carbs_g=20.0,
                        fat_g=5.0,
                        fiber_g=3.0,
                        assumptions=["Standard breakfast preparation"]
                    ))

                # Lunch segment
                if has_lunch:
                    detected_meals.append(MealLogCreate(
                        meal_type="lunch",
                        meal_title="Afternoon Lunch Log",
                        raw_transcript=text,
                        items=[
                            FoodItemBreakdown(name="Phulka with Ghee", portion="2 Rotis", quantity=2, unit="piece", calories=170.0, protein_g=4.8, carbs_g=30.0, fat_g=3.6, fiber_g=3.8, source="icmr_nin"),
                            FoodItemBreakdown(name="Dal Tadka", portion="1 Katori (150g)", quantity=1, unit="katori", calories=145.0, protein_g=8.2, carbs_g=19.5, fat_g=4.2, fiber_g=4.5, source="icmr_nin")
                        ],
                        calories=315.0,
                        protein_g=13.0,
                        carbs_g=49.5,
                        fat_g=7.8,
                        fiber_g=8.3,
                        assumptions=["Assumed 1 tsp ghee per roti"]
                    ))

                # Dinner segment
                if has_dinner:
                    detected_meals.append(MealLogCreate(
                        meal_type="dinner",
                        meal_title="Night Dinner Log",
                        raw_transcript=text,
                        items=[
                            FoodItemBreakdown(name="Paneer / Soya Sabzi", portion="1 Bowl (150g)", quantity=1, unit="bowl", calories=260.0, protein_g=16.0, carbs_g=12.0, fat_g=16.0, fiber_g=3.0, source="icmr_nin"),
                            FoodItemBreakdown(name="Phulka", portion="1 Roti", quantity=1, unit="piece", calories=85.0, protein_g=2.4, carbs_g=15.0, fat_g=1.8, fiber_g=1.9, source="icmr_nin")
                        ],
                        calories=345.0,
                        protein_g=18.4,
                        carbs_g=27.0,
                        fat_g=17.8,
                        fiber_g=4.9,
                        assumptions=["Standard home preparation"]
                    ))
            else:
                # Single meal fallback
                items: List[FoodItemBreakdown] = []
                meal_type = "lunch"
                meal_title = "Homestyle Balanced Meal"

                if "breakfast" in text_lower or "poha" in text_lower or "idli" in text_lower or "oats" in text_lower:
                    meal_type = "breakfast"
                elif "dinner" in text_lower:
                    meal_type = "dinner"
                elif "snack" in text_lower or "tea" in text_lower or "coffee" in text_lower or "chai" in text_lower:
                    meal_type = "snack"

                # Beverage checks
                if "coffee" in text_lower:
                    meal_title = "Coffee"
                    if any(k in text_lower for k in ["black", "americano", "espresso", "without milk", "no milk"]):
                        items.append(FoodItemBreakdown(name="Black Coffee (No Milk, No Sugar)", portion="1 Cup (200ml)", quantity=1, unit="cup", calories=5.0, protein_g=0.3, carbs_g=0.5, fat_g=0.1, fiber_g=0.0, source="icmr_nin"))
                        meal_title = "Black Coffee"
                    else:
                        items.append(FoodItemBreakdown(name="Coffee with Milk & Sugar", portion="1 Cup (150ml)", quantity=1, unit="cup", calories=75.0, protein_g=2.5, carbs_g=9.0, fat_g=3.2, fiber_g=0.0, source="icmr_nin"))
                        clarifications.append(ClarificationItem(
                            id="coffee_type",
                            question="How was your coffee prepared?",
                            assumed_value="With Whole Milk & 1 tsp Sugar (~75 kcal)",
                            options=["Black (No milk, no sugar)", "With Milk, No Sugar", "With Milk & Sugar (Default)", "With Oat/Almond Milk"]
                        ))
                elif "tea" in text_lower or "chai" in text_lower:
                    meal_title = "Chai / Tea"
                    if "green" in text_lower or "black" in text_lower:
                        items.append(FoodItemBreakdown(name="Green / Black Tea", portion="1 Cup (200ml)", quantity=1, unit="cup", calories=2.0, protein_g=0.1, carbs_g=0.4, fat_g=0.0, fiber_g=0.0, source="icmr_nin"))
                    else:
                        items.append(FoodItemBreakdown(name="Masala Chai with Milk & Sugar", portion="1 Cup (150ml)", quantity=1, unit="cup", calories=65.0, protein_g=2.0, carbs_g=8.5, fat_g=2.8, fiber_g=0.0, source="icmr_nin"))
                        clarifications.append(ClarificationItem(
                            id="tea_type",
                            question="How was your tea prepared?",
                            assumed_value="Masala Chai with Milk & Sugar (~65 kcal)",
                            options=["Without Sugar", "Standard Chai with Sugar", "Black / Green Tea", "Ginger / Cardamom Spiced"]
                        ))
                elif "oat" in text_lower or "yogabar" in text_lower:
                    items.append(FoodItemBreakdown(name="Yogabar / Rolled Oats with Skimmed Milk", portion="60g Dry Weight", quantity=60, unit="g", calories=230.0, protein_g=9.5, carbs_g=39.0, fat_g=4.2, fiber_g=6.0, source="icmr_nin"))
                    meal_title = "Yogabar Oats Bowl"
                elif "paneer" in text_lower:
                    items.append(FoodItemBreakdown(name="Paneer Sabzi / Bhurji", portion="1 Bowl (150g)", quantity=1, unit="bowl", calories=280.0, protein_g=18.0, carbs_g=8.0, fat_g=20.0, fiber_g=2.0, source="icmr_nin"))
                    items.append(FoodItemBreakdown(name="Phulka with Ghee", portion="3 Rotis", quantity=3, unit="piece", calories=255.0, protein_g=7.2, carbs_g=45.0, fat_g=5.4, fiber_g=5.7, source="icmr_nin"))
                    meal_title = "Paneer Sabzi with 3 Rotis"
                elif "roti" in text_lower or "phulka" in text_lower:
                    items.append(FoodItemBreakdown(name="Phulka with Ghee", portion="2 Rotis", quantity=2, unit="piece", calories=170.0, protein_g=4.8, carbs_g=30.0, fat_g=3.6, fiber_g=3.8, source="icmr_nin"))
                    items.append(FoodItemBreakdown(name="Dal Tadka", portion="1 Katori (150g)", quantity=1, unit="katori", calories=145.0, protein_g=8.2, carbs_g=19.5, fat_g=4.2, fiber_g=4.5, source="icmr_nin"))
                    meal_title = "2 Rotis with Dal Tadka"
                else:
                    items.append(FoodItemBreakdown(name="Homestyle Balanced Meal", portion="1 Plate", quantity=1, unit="plate", calories=350.0, protein_g=10.0, carbs_g=45.0, fat_g=12.0, fiber_g=5.0, source="icmr_nin"))

                total_cals = round(sum(i.calories for i in items), 1)
                total_prot = round(sum(i.protein_g for i in items), 1)
                total_carbs = round(sum(i.carbs_g for i in items), 1)
                total_fat = round(sum(i.fat_g for i in items), 1)
                total_fiber = round(sum(i.fiber_g for i in items), 1)

                detected_meals.append(MealLogCreate(
                    meal_type=meal_type,
                    meal_title=meal_title,
                    raw_transcript=text,
                    items=items,
                    calories=total_cals,
                    protein_g=total_prot,
                    carbs_g=total_carbs,
                    fat_g=total_fat,
                    fiber_g=total_fiber,
                    assumptions=["Standard home preparation"]
                ))

        return detected_meals, clarifications

nutrition_agent = NutritionAgent()
