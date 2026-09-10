import re
import time
import logging
from typing import Dict, Any, Optional, Tuple
from app.services.gemini_service import gemini_service

logger = logging.getLogger("CaloraAI.IntentAgent")

# ==============================================================================
# COMPILED REGEX PATTERNS FOR ZERO-LATENCY FAST-PATH ROUTING (<1ms)
# ==============================================================================

# 1. Food & Beverage Verbs / Actions
FOOD_VERBS_REGEX = re.compile(
    r'\b(had|ate|eaten|eating|drank|drinking|drink|consumed|having|cooked|made|ordered|snacked|breakfast|lunch|dinner|snack|supper|brunch)\b',
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
    r'protein\s+shake|whey|creatine|smoothie|juice'
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
    r'\b(should\s+i|how\s+much\s+should|suggest|recommend|what\s+to\s+eat|advice|tips|recipe|target|goal|how\s+many\s+calories\s+in)\b',
    re.IGNORECASE
)

# 8. Mutation / Update / Delete Triggers
MUTATION_TRIGGERS_REGEX = re.compile(
    r'\b(update|change|modify|replace|edit|remove|delete|cancel|instead\s+of|swap|correct)\b',
    re.IGNORECASE
)

# 9. Historical Query / Navigation Triggers
QUERY_HISTORY_REGEX = re.compile(
    r'\b(show\s+me|what\s+did\s+i\s+(?:eat|have|log|do)|view|history|check\s+logs|how\s+many\s+calories\s+did\s+i\s+(?:eat|burn|consume)|did\s+i\s+workout)\b',
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
        Evaluates input using local compiled regex engines in <1ms.
        Returns (intent, confidence) or None if input requires LLM reasoning.
        """
        text_clean = text.strip()
        if not text_clean:
            return ("unknown", 1.0)

        # Check mutation/update triggers
        if MUTATION_TRIGGERS_REGEX.search(text_clean):
            return ("mutation", 0.95)

        # Check historical query triggers
        if QUERY_HISTORY_REGEX.search(text_clean):
            return ("query_history", 0.95)

        # Check advice triggers (e.g. general questions)
        if "?" in text_clean or ADVICE_TRIGGERS_REGEX.search(text_clean):
            return ("advice", 0.95)

        # Evaluate food signals
        has_food_verb = bool(FOOD_VERBS_REGEX.search(text_clean))
        has_food_portion = bool(FOOD_PORTIONS_REGEX.search(text_clean))
        has_food_item = bool(FOOD_ITEMS_REGEX.search(text_clean))

        food_score = (2.0 if has_food_item else 0.0) + (1.5 if has_food_portion else 0.0) + (1.0 if has_food_verb else 0.0)

        # Evaluate workout signals
        has_workout_duration = bool(WORKOUT_DURATION_REGEX.search(text_clean))
        has_workout_item = bool(WORKOUT_ITEMS_REGEX.search(text_clean))
        has_workout_metric = bool(WORKOUT_METRICS_REGEX.search(text_clean))

        workout_score = (2.0 if has_workout_item else 0.0) + (1.5 if has_workout_duration else 0.0) + (2.0 if has_workout_metric else 0.0)

        # Fast-Path Decision Matrix
        if food_score >= 2.0 and workout_score >= 2.0:
            return ("both", 0.98)
        elif workout_score >= 2.0:
            confidence = min(0.99, 0.85 + (workout_score * 0.03))
            return ("workout", confidence)
        elif food_score >= 2.0:
            confidence = min(0.99, 0.85 + (food_score * 0.03))
            return ("meal", confidence)

        # Borderline or ambiguous -> Fall back to LLM
        return None

    def parse_intent(self, text: str) -> str:
        """
        Hybrid 2-Tier Intent Classifier:
        1. Fast-Path Local Heuristics (<1ms) -> 90%+ of cases
        2. Gemini LLM Failover -> Complex / Conversational sentences
        """
        t0 = time.perf_counter()

        # Tier 1: Fast-Path Local Matching (<1ms)
        fast_result = self.classify_fast_path(text)
        if fast_result:
            intent, confidence = fast_result
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            logger.info(f"[IntentAgent] Fast-Path resolved intent='{intent}' (conf={confidence:.2f}) in {elapsed_ms:.2f}ms")
            return intent

        # Tier 2: Gemini LLM Failover
        logger.info("[IntentAgent] Ambiguous input. Invoking Gemini LLM for conversational classification...")
        system_instruction = (
            "You are an Intent Classifier for a health tracking application. "
            "Classify the user's spoken input into exactly one of: "
            "'meal' (logging food/drinks), 'workout' (logging exercise/gym), "
            "'both' (both food and workout), 'mutation' (editing, updating, replacing, or deleting existing logs), "
            "'query_history' (viewing, checking, or asking about past meals/workouts for a specific date), "
            "'advice' (asking general health tips/questions), "
            "or 'unknown' (unrelated noise/chat). "
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
