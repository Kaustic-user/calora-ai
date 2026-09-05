import sys
import os
import time
from typing import List, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.agents.intent_agent import intent_agent

# ==============================================================================
# UNIFIED INTENT BENCHMARK SUITE (FOOD, WORKOUT, BOTH, ADVICE, INDIRECT/STORY)
# ==============================================================================

TEST_CASES: List[Tuple[str, str]] = [
    # --- Direct Food Logs (Fast-Path) ---
    ("I had 2 rotis with paneer butter masala and dal", "meal"),
    ("Drank one cup of coffee with milk", "meal"),
    ("100g raw soya chunks boiled with salt", "meal"),
    ("Had a bowl of curd with 1 apple", "meal"),
    ("3 boiled egg whites and 2 slices brown toast", "meal"),
    ("60g of Yogabar oats with water", "meal"),
    ("Ek plate poha with chai", "meal"),
    ("Ate chicken breast with green salad", "meal"),
    ("2 phulkas with bhindi and chaas", "meal"),
    ("Drank 1 scoop whey protein shake", "meal"),

    # --- Direct Workout Logs (Fast-Path) ---
    ("45 min chest and triceps workout at gym", "workout"),
    ("Ran 5 km in 28 minutes this morning", "workout"),
    ("Did 3 sets of 10 reps bench press and squats", "workout"),
    ("30 minutes morning yoga and stretching", "workout"),
    ("1 hour high intensity cycling session", "workout"),
    ("Did 50 pushups and 20 pullups", "workout"),
    ("Walked 8000 steps today", "workout"),
    ("60 min swimming workout", "workout"),
    ("Leg day at the gym 45 mins", "workout"),
    ("20 min HIIT cardio workout", "workout"),

    # --- Combined Logs (Fast-Path) ---
    ("I had 3 boiled eggs and then did a 30 min jog", "both"),
    ("Drank black coffee and went for a 45 min gym workout", "both"),
    ("Ate 60g oats and completed a 5 km run", "both"),
    ("Had protein shake after 1 hour weight training", "both"),
    ("Ate 2 bananas and ran 4 km", "both"),

    # --- Direct Advice / Health Questions (Fast-Path) ---
    ("How much protein should I eat for dinner?", "advice"),
    ("What are some good high-protein vegetarian snacks?", "advice"),
    ("Suggest a good workout split for muscle building", "advice"),

    # --- Indirect / Storytelling / Complex Cases (Gemini LLM Tier-2) ---
    ("I visited my grandparents and feasted on a grand homemade spread until I was stuffed", "meal"),
    ("Indulged in a massive cheat day with family at the weekend buffet", "meal"),
    ("We ordered a huge birthday feast with lots of appetizers and sweet treats", "meal"),
    ("Helped my cousin carry heavy furniture up four flights of stairs and was drenched in sweat", "workout"),
    ("Spent 3 hours doing intense backyard landscaping and digging trenches", "workout"),
    ("I feel completely drained and lethargic after my afternoon meal today", "advice"),
]

def run_benchmark():
    print("=" * 98)
    print("🚀 CALORA AI UNIFIED INTENT ROUTING BENCHMARK (FAST-PATH VS LLM DETECTION)")
    print("=" * 98)
    print(f"{'#':<3} | {'Status':<6} | {'Routed Path':<13} | {'Time (ms)':<9} | {'Expected':<8} | {'Got':<8} | {'Statement'}")
    print("-" * 98)

    fast_total = 0
    fast_passed = 0
    fast_failed = 0
    fast_latencies: List[float] = []

    llm_total = 0
    llm_passed = 0
    llm_failed = 0
    llm_latencies: List[float] = []

    for idx, (text, expected_intent) in enumerate(TEST_CASES, start=1):
        t0 = time.perf_counter()

        # Check if local fast-path handles it
        fast_res = intent_agent.classify_fast_path(text)

        if fast_res is not None:
            actual_intent, conf = fast_res
            route_name = "⚡ FAST-PATH"
            is_fast = True
        else:
            # LLM Path with automatic retry for free-tier rate limits (429)
            route_name = "🤖 LLM TIER-2"
            is_fast = False

            # Pacing to avoid Google free-tier bursts
            time.sleep(1.5)
            actual_intent = intent_agent.parse_intent(text)

            # If rate-limited on free tier, retry once after a short 3s pause
            if actual_intent == "unknown" and expected_intent != "unknown":
                time.sleep(3.0)
                actual_intent = intent_agent.parse_intent(text)

        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        is_correct = (actual_intent == expected_intent)

        if is_fast:
            fast_total += 1
            fast_latencies.append(elapsed_ms)
            if is_correct:
                fast_passed += 1
            else:
                fast_failed += 1
        else:
            llm_total += 1
            llm_latencies.append(elapsed_ms)
            if is_correct:
                llm_passed += 1
            else:
                llm_failed += 1

        status_str = "✅ PASS" if is_correct else "❌ FAIL"
        disp_text = (text[:36] + '...') if len(text) > 39 else text
        print(f"{idx:02d}  | {status_str:<6} | {route_name:<13} | {elapsed_ms:8.2f}  | {expected_intent:<8} | {actual_intent:<8} | \"{disp_text}\"")

    print("=" * 98)
    total_cases = len(TEST_CASES)
    total_passed = fast_passed + llm_passed
    total_failed = fast_failed + llm_failed
    overall_accuracy = (total_passed / total_cases) * 100.0

    fast_acc = (fast_passed / fast_total * 100.0) if fast_total > 0 else 0.0
    llm_acc = (llm_passed / llm_total * 100.0) if llm_total > 0 else 0.0

    avg_fast = (sum(fast_latencies) / len(fast_latencies)) if fast_latencies else 0.0
    avg_llm = (sum(llm_latencies) / len(llm_latencies)) if llm_latencies else 0.0
    all_latencies = fast_latencies + llm_latencies
    overall_avg = sum(all_latencies) / len(all_latencies)

    print("📊 DETAILED PASS/FAIL BENCHMARK SUMMARY:")
    print("-" * 98)
    print(f" • ⚡ FAST-PATH TIER 1:   Pass: {fast_passed:2d} | Fail: {fast_failed:2d} | Total: {fast_total:2d} | Rate: {fast_acc:5.1f}% | Avg Latency: {avg_fast:6.3f} ms ⚡")
    print(f" • 🤖 LLM PATH TIER 2:    Pass: {llm_passed:2d} | Fail: {llm_failed:2d} | Total: {llm_total:2d} | Rate: {llm_acc:5.1f}% | Avg Latency: {avg_llm:6.1f} ms 🤖")
    print("-" * 98)
    print(f" • 🏆 OVERALL TOTAL:     Pass: {total_passed:2d} | Fail: {total_failed:2d} | Total: {total_cases:2d} | Rate: {overall_accuracy:5.1f}% | Avg Latency: {overall_avg:6.2f} ms")
    print("=" * 98)

if __name__ == "__main__":
    run_benchmark()
