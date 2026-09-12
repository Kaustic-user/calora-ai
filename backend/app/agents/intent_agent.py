import re
import time
import logging
from typing import Dict, Any, Optional, Tuple
from app.services.gemini_service import gemini_service

logger = logging.getLogger("CaloraAI.IntentAgent")

# ==============================================================================
# COMPILED REGEX PATTERNS FOR ZERO-LATENCY FAST-PATH ROUTING (<0.05ms)
# ==============================================================================

# 1. Food & Beverage Verbs / Actions
FOOD_VERBS_REGEX = re.compile(
    r'\b(had|ate|eaten|eating|drank|drinking|drink|consumed|consuming|having|cooked|made|ordered|snacked|breakfast|lunch|dinner|snack|supper|brunch)\b',
    re.IGNORECASE
)

# 2. Food Portions & Measurement Units
FOOD_PORTIONS_REGEX = re.compile(
    r'\b(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams?|kg|kilos?|ml|l|liters?|litres?|katori|katoris|bowl|bowls|plate|plates|cup|cups|glass|glasses|roti|rotis|phulka|phulkas|chapati|chapatis|slice|slices|scoop|scoops|egg|eggs|piece|pieces|tbsp|tsp|tablespoon|teaspoon)\b',
    re.IGNORECASE
)

# 3. Comprehensive Food / Beverage Lexicon
FOOD_ITEMS_REGEX = re.compile(
    r'\b('
    r'chai|tea|coffee|espresso|americano|cappuccino|latte|mocha|green\s+tea|black\s+coffee|'
    r'roti|phulka|chapati|naan|paratha|parathas|puri|bhature|kulcha|'
    r'dal|daal|tadka|makhani|sambar|rasam|chole|rajma|kadhi|'
    r'rice|biryani|pulao|jeera\s+rice|khichdi|fried\s+rice|chawal|'
    r'paneer|tofu|soya|soya\s+chunks|curd|dahi|yogurt|lassi|buttermilk|chaas|'
    r'poha|upma|idli|dosa|uttapam|vada|cheela|besan\s+chilla|'
    r'egg|eggs|omelette|bhurji|boiled\s+egg|egg\s+white|'
    r'chicken|fish|mutton|prawns|salmon|tuna|breast|tikka|kebab|'
    r'oats|oatmeal|yogabar|yoga\s+bar|muesli|cornflakes|granola|cereal|'
    r'bread|toast|sandwich|burger|pizza|pasta|noodles|maggi|wrap|'
    r'salad|soup|sprouts|fruit|fruits|apple|banana|bananas|mango|orange|papaya|nuts|almonds|walnuts|peanuts|'
    r'protein\s+(?:shake|bar|snack|powder|drink)|whey|creatine|smoothie|juice|energy\s+bar'
    r')\b',
    re.IGNORECASE
)

# 4. Exercise & Workout Actions / Durations
WORKOUT_DURATION_REGEX = re.compile(
    r'\b(\d+(?:\.\d+)?)\s*(?:min|mins|minutes?|hr|hrs|hours?)\s+(?:workout|training|session|exercise|gym|cardio|running|run|jog|jogging|walk|walking|cycling|swimming|yoga|hiit)\b',
    re.IGNORECASE
)

# 5. Exercises, Muscle Groups & Gym Terminology
WORKOUT_ITEMS_REGEX = re.compile(
    r'\b('
    r'workout|gym|exercise|training|cardio|hiit|stretching|warmup|'
    r'bench\s+press|squat|squats|deadlift|deadlifts|overhead\s+press|shoulder\s+press|'
    r'bicep\s+curls?|tricep\s+pushdowns?|lat\s+pulldowns?|dumbbell\s+rows?|leg\s+press|'
    r'pushups?|pullups?|dips?|crunches|plank|lunges|burpees|jumping\s+jacks|'
    r'treadmill|running|run|ran|jog|jogged|jogging|sprint|sprinted|sprinting|walk|walked|walking|'
    r'cycling|biking|cycle|cycled|swimming|swam|swim|yoga(?!\s+bar)|pilates|'
    r'chest|back|legs|shoulders|arms|biceps|triceps|abs|core|quads|hamstrings|glutes|'
    r'sets|reps|repetitions'
    r')\b',
    re.IGNORECASE
)

# 6. Distance & Workout Metrics (Handles: "5 km run", "Ran 5 km", "Walked 8000 steps", "8000 steps")
WORKOUT_METRICS_REGEX = re.compile(
    r'(?:\b(?:ran|run|walked|walk|jogged|jog|cycled|cycle)\s+(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers?|miles?|meters?|steps?)\b)'
    r'|'
    r'(?:\b(\d+(?:\.\d+)?)\s*(?:km|kms|kilometers?|miles?|meters?|steps?)\s+(?:run|ran|jog|jogged|walk|walked|cycle|cycled)\b)'
    r'|'
    r'(?:\b(?:walked|completed)\s+(\d+)\s+steps\b)',
    re.IGNORECASE
)

# 7. Conversational / Advice Triggers
ADVICE_TRIGGERS_REGEX = re.compile(
    r'\b('
    r'should\s+i|how\s+much\s+should|suggest|recommend|what\s+to\s+eat|what\s+should\s+i|'
    r'advice|tips|recipe|target|goal|how\s+many\s+calories\s+in|how\s+much\s+protein\s+in|'
    r'how\s+many\s+carbs\s+in|can\s+i\s+(?:eat|have|take|drink)|is\s+it\s+(?:good|bad|healthy|ok|okay)\s+to|'
    r'alternative\s+to|substitute\s+for|best\s+(?:way|food|workout|exercise|diet)|how\s+can\s+i\s+(?:lose|gain|build|improve)|'
    r'how\s+to\s+(?:make|cook|prepare|burn|lose|gain|build)'
    r')\b',
    re.IGNORECASE
)

INTERROGATIVE_START_REGEX = re.compile(
    r'^\s*(what|how|why|where|when|who|which|can|could|should|would|is|are|will|do\s+(?:i|we|you|they)|does\s+(?:it|this|that|he|she)|did\s+(?:i|we|you|they|he|she))\b',
    re.IGNORECASE
)

# 8. Mutation / Update / Delete Triggers
MUTATION_TRIGGERS_REGEX = re.compile(
    r'\b(update|change|modify|replace|edit|remove|delete|cancel|instead\s+of|swap|correct)\b',
    re.IGNORECASE
)

# 9. Historical Query / Navigation Triggers
QUERY_HISTORY_REGEX = re.compile(
    r'\b('
    r'(?:show(?:\s+me)?|check|view|list|get)\s+(?:my\s+|the\s+|all\s+)?(?:food\s+|workout\s+|gym\s+|exercise\s+|dinner\s+|lunch\s+|breakfast\s+|past\s+)?(?:logs?|history|entries|records?|meals?|workouts?)|'
    r'what\s+(?:did\s+i|was\s+my|were\s+my)\s+(?:eat|have|log|do|consume|burn|total|intake|meals?)|'
    r'how\s+many\s+calories\s+did\s+i\s+(?:eat|burn|consume|log)|'
    r'did\s+i\s+(?:do|log|have|eat|consume|burn|workout|exercise)|'
    r'what\s+all\s+did\s+i\s+(?:eat|have|log|do)'
    r')\b',
    re.IGNORECASE
)

# 10. Temporal Expressions
TEMPORAL_REGEX = re.compile(
    r'\b(yesterday|day\s+before\s+yesterday|today|last\s+night|this\s+morning|last\s+evening|on\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\d+\s+days?\s+ago|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)|(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{1,2}(?:st|nd|rd|th)?)\b',
    re.IGNORECASE
)


class IntentAgent:
    def classify_fast_path(self, text: str) -> Optional[Tuple[str, float]]:
        """
        Evaluates input using local compiled regex engines in <0.05ms.
        Returns (intent, confidence) for high-confidence unambiguous inputs,
        or None if input has any conflict, doubt, question-entity collision, or ambiguity
        to cascade to Tier 2 Gemini LLM reasoning.
        """
        text_clean = text.strip()
        if not text_clean:
            return ("unknown", 1.0)

        t_lower = text_clean.lower()

        # 0. Detect Negative / Skipped statement signals ("didn't eat", "skipped workout", "no dinner")
        has_negative = bool(re.search(r'\b(didn\'?t|did\s+not|skipped|skip|no\s+(?:breakfast|lunch|dinner|meal|workout|exercise)|forgot\s+to)\b', t_lower))
        if has_negative:
            # Doubt/Ambiguity -> Cascade to LLM to reason about skipped or negated entries
            return None

        # 1. Detect Interrogative & Question signals
        has_question_mark = "?" in text_clean
        has_interrogative_start = bool(INTERROGATIVE_START_REGEX.search(text_clean))
        is_question = has_question_mark or has_interrogative_start

        # 2. Detect Mutation & Edit triggers
        has_mutation_trigger = bool(MUTATION_TRIGGERS_REGEX.search(text_clean))

        # 3. Detect Query History triggers
        has_query_history_trigger = bool(QUERY_HISTORY_REGEX.search(text_clean))

        # 4. Detect Advice / Recommendation / Nutritional inquiry triggers
        has_advice_phrase = bool(ADVICE_TRIGGERS_REGEX.search(text_clean))

        # 5. Evaluate Food signals
        has_food_verb = bool(FOOD_VERBS_REGEX.search(text_clean))
        has_food_portion = bool(FOOD_PORTIONS_REGEX.search(text_clean))
        has_food_item = bool(FOOD_ITEMS_REGEX.search(text_clean))
        food_score = (2.0 if has_food_item else 0.0) + (1.5 if has_food_portion else 0.0) + (1.0 if has_food_verb else 0.0)

        # 6. Evaluate Workout signals
        has_workout_duration = bool(WORKOUT_DURATION_REGEX.search(text_clean))
        has_workout_item = bool(WORKOUT_ITEMS_REGEX.search(text_clean))
        has_workout_metric = bool(WORKOUT_METRICS_REGEX.search(text_clean))
        workout_score = (2.0 if has_workout_item else 0.0) + (1.5 if has_workout_duration else 0.0) + (2.0 if has_workout_metric else 0.0)

        # ==============================================================================
        # CONFLICT / COLLISION RESOLUTION (DOUBT -> CASCADE TO LLM)
        # ==============================================================================

        # Collision A: Mutation word inside a Question / Advice sentence
        # e.g., "Should I replace white rice with brown rice?" or "Can I change my diet plan?"
        if has_mutation_trigger and (is_question or has_advice_phrase):
            # Conflict between mutation and advice/inquiry -> Cascade to LLM
            return None

        # Collision B: Query history phrase collided with Advice / Recipe
        # e.g., "Show me how to make high protein oats" or "Show me a recipe for keto salad"
        if has_query_history_trigger and (has_advice_phrase or re.search(r'\b(how\s+to|recipe|tips|suggest|recommend|better|best)\b', t_lower)):
            return None

        # Collision C: Interrogative / Question sentences
        if is_question:
            # High-confidence query history questions: "What did I eat yesterday?", "Did I log any workout yesterday?"
            if has_query_history_trigger:
                return ("query_history", 0.95)

            # High-confidence advice questions: "Should I take creatine?", "What is a healthy alternative to sugar in tea?"
            if has_advice_phrase:
                return ("advice", 0.95)

            # Questions asking about general nutrition/health topics without logging verbs
            health_kw_match = bool(re.search(r'\b(protein|calorie|calories|macro|macros|carb|carbs|fat|fats|fiber|diet|nutrition|weight|muscle|workout|exercise|food|meal|eat|eating|drinking|recipe|snack|paneer|eggs?|rotis?|rice|dal|oats|chicken|salad|tea|chai|coffee|sugar)\b', t_lower))
            if health_kw_match and not has_food_verb:
                return ("advice", 0.92)

            # Any conflicting or ambiguous question -> Cascade to LLM
            return None

        # Unambiguous Historical Query (imperative, e.g. "Show me my logs", "View yesterday's meals")
        if has_query_history_trigger:
            return ("query_history", 0.95)

        # Unambiguous Mutation / Edit / Delete command (e.g. "Update yesterday's lunch: change 2 rotis to 3 rotis")
        if has_mutation_trigger:
            return ("mutation", 0.95)

        # Unambiguous Advice request (e.g. "Suggest high protein snacks", "Recipe for oats smoothie")
        if has_advice_phrase:
            return ("advice", 0.95)

        # Collision D: Dual Entity (Food + Workout)
        if food_score >= 2.0 and workout_score >= 2.0:
            # Check for sequencing indicators (e.g. "then had", "after workout", "followed by")
            has_sequence = bool(re.search(r'\b(then|after|followed\s+by|and\s+(?:also\s+)?(?:had|ate|drank|consumed|did|completed|walked|ran)|before\s+(?:gym|workout))\b', t_lower))
            if has_sequence or (has_food_verb and (has_workout_duration or has_workout_metric)):
                return ("both", 0.98)
            else:
                # Ambiguous combination without clear sequence -> Cascade to LLM
                return None

        # Clear Single Entity: Workout Log
        if workout_score >= 2.0 and food_score < 2.0:
            confidence = min(0.99, 0.85 + (workout_score * 0.03))
            return ("workout", confidence)

        # Clear Single Entity: Meal Log
        if food_score >= 2.0 and workout_score < 2.0:
            confidence = min(0.99, 0.85 + (food_score * 0.03))
            return ("meal", confidence)

        # Borderline / Low Score / Unknown Noise -> Fall back to LLM
        return None

    def parse_intent(self, text: str) -> str:
        """
        Hybrid 2-Tier Intent Classifier:
        1. Fast-Path Local Heuristics (<0.05ms) -> Handles unambiguous high-confidence cases
        2. Gemini LLM Failover -> Handles any conflict, doubt, nuance, or conversational sentence
        """
        t0 = time.perf_counter()

        # Tier 1: Fast-Path Local Matching (<0.05ms)
        fast_result = self.classify_fast_path(text)
        if fast_result is not None:
            intent, confidence = fast_result
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            logger.info(f"[IntentAgent] Fast-Path resolved intent='{intent}' (conf={confidence:.2f}) in {elapsed_ms:.3f}ms")
            return intent

        # Tier 2: Gemini LLM Failover (Triggered when there is any doubt or signal conflict)
        logger.info("[IntentAgent] Ambiguity/Conflict detected. Cascading to Gemini LLM for reasoning...")
        system_instruction = (
            "You are an Intent Classifier for a health tracking application. "
            "Classify the user's spoken input into exactly one of: "
            "'meal' (logging food/drinks), 'workout' (logging exercise/gym), "
            "'both' (both food and workout), 'mutation' (editing, updating, replacing, or deleting existing logs), "
            "'query_history' (viewing, checking, or asking about past meals/workouts for a specific date), "
            "'advice' (asking general health tips/questions/recipes/nutritional information), "
            "or 'unknown' (unrelated noise/chat/unclear statements). "
            "Output JSON with format: {'intent': string, 'confidence': float}"
        )
        prompt = f"User input: '{text}'"
        result = gemini_service.generate_json_response(prompt, system_instruction)

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        if result and "intent" in result:
            intent = result["intent"]
            logger.info(f"[IntentAgent] Gemini resolved intent='{intent}' in {elapsed_ms:.2f}ms")
            return intent

        # Safe fallback
        logger.info(f"[IntentAgent] Fallback resolved to 'unknown' in {elapsed_ms:.2f}ms")
        return "unknown"

intent_agent = IntentAgent()
