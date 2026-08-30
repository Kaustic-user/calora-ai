from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ==========================================
# Food & Nutrition Schemas
# ==========================================

class FoodItemBreakdown(BaseModel):
    name: str
    portion: str
    quantity: float = 1.0
    unit: str = "piece"
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float = 0.0
    is_estimated: bool = False
    source: str = "icmr_nin"

class MealLogCreate(BaseModel):
    meal_type: str = "lunch"
    meal_title: str
    raw_transcript: Optional[str] = None
    items: List[FoodItemBreakdown] = []
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float = 0.0
    assumptions: List[str] = []
    log_date: Optional[date] = None

class MealLogResponse(BaseModel):
    id: int
    meal_type: str
    meal_title: str
    raw_transcript: Optional[str] = None
    items: List[Dict[str, Any]] = []
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    assumptions: List[str] = []
    is_confirmed: bool = True
    log_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Workout & Exercise Schemas
# ==========================================

class WorkoutLogCreate(BaseModel):
    exercise_name: str
    workout_category: str = "strength"
    duration_minutes: int = 30
    intensity: str = "moderate"
    calories_burned: float
    muscle_groups: str = "Full Body"
    notes: Optional[str] = None
    log_date: Optional[date] = None

class WorkoutLogResponse(BaseModel):
    id: int
    exercise_name: str
    workout_category: str
    duration_minutes: int
    intensity: str
    calories_burned: float
    muscle_groups: str
    notes: Optional[str] = None
    log_date: date
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# User Profile & Habits Schemas
# ==========================================

class UserProfileSchema(BaseModel):
    id: Optional[int] = 1
    name: str = "Fitness Enthusiast"
    calorie_target: int = 2000
    protein_target: float = 120.0
    carbs_target: float = 225.0
    fat_target: float = 65.0
    fiber_target: float = 30.0
    water_target_liters: float = 3.0
    weight_kg: float = 70.0
    dietary_preference: str = "vegetarian"
    allergies: str = ""

    model_config = ConfigDict(from_attributes=True)

class UserMemoryResponse(BaseModel):
    id: int
    category: str = "habit"
    key: str
    value: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Summary & AI Processing Schemas
# ==========================================

class DailySummaryResponse(BaseModel):
    date: date
    calorie_target: int
    calories_consumed: float
    calories_burned: float
    net_calories: float
    protein_target: float
    protein_consumed: float
    carbs_target: float
    carbs_consumed: float
    fat_target: float
    fat_consumed: float
    fiber_target: float
    fiber_consumed: float
    meals: List[MealLogResponse]
    workouts: List[WorkoutLogResponse]

class AgentVoiceProcessRequest(BaseModel):
    text: Optional[str] = None

class ClarificationItem(BaseModel):
    id: str
    question: str
    assumed_value: str
    options: List[str]

class ClarificationResolveRequest(BaseModel):
    clarification_id: str
    chosen_option: str
    raw_transcript: Optional[str] = None
    pending_meal: Optional[MealLogCreate] = None
    pending_workout: Optional[WorkoutLogCreate] = None
    is_final: bool = True

class AgentProcessResponse(BaseModel):
    transcript: str
    intent: str # meal, workout, both, advice, unknown
    detected_meal: Optional[MealLogCreate] = None
    detected_meals: List[MealLogCreate] = []
    detected_workout: Optional[WorkoutLogCreate] = None
    clarifications: List[ClarificationItem] = []
    insights: List[str] = []
    status: str = "success"

class MealRecommendationOption(BaseModel):
    title: str
    description: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    items: List[str]
    time_to_cook: str
    dietary: str

class DailyTrendPoint(BaseModel):
    date: date
    day: str
    calories: float
    protein: float
    carbs: float
    fat: float
    burned: float
    net: float

class WeeklyTrendsResponse(BaseModel):
    calorie_target: int
    protein_target: float
    daily_data: List[DailyTrendPoint]
    weekly_avg_calories: float
    weekly_avg_protein: float
    weekly_total_burned: float
    days_logged: int
