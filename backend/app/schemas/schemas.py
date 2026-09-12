from datetime import date, datetime
from typing import List, Optional, Dict, Any, Union
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
    height_cm: float = 175.0
    age: int = 25
    gender: str = "male"
    activity_level: str = "sedentary"
    target_deficit_kcal: int = 500
    dietary_preference: str = "vegetarian"
    allergies: str = ""
    bmr: Optional[float] = None
    tdee: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    calorie_target: Optional[int] = None
    protein_target: Optional[float] = None
    carbs_target: Optional[float] = None
    fat_target: Optional[float] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    activity_level: Optional[str] = None
    target_deficit_kcal: Optional[int] = None
    dietary_preference: Optional[str] = None
    allergies: Optional[str] = None

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
    tdee: float = 2000.0
    bmr: float = 1600.0
    total_burn: float = 2000.0
    calorie_deficit: float = 0.0
    is_in_deficit: bool = False
    target_deficit: int = 500
    meals: List[MealLogResponse]
    workouts: List[WorkoutLogResponse]

class AgentVoiceProcessRequest(BaseModel):
    text: Optional[str] = None
    target_date: Optional[Union[date, str]] = None

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
    log_date: Optional[date] = None
    is_final: bool = True

class AgentProcessResponse(BaseModel):
    transcript: str
    intent: str # meal, workout, both, advice, unknown
    detected_meal: Optional[MealLogCreate] = None
    detected_meals: List[MealLogCreate] = []
    detected_workout: Optional[WorkoutLogCreate] = None
    saved_meal_id: Optional[int] = None
    saved_workout_id: Optional[int] = None
    clarifications: List[ClarificationItem] = []
    insights: List[str] = []
    status: str = "success"
    navigation_date: Optional[date] = None
    has_explicit_date: bool = False
    log_date: Optional[date] = None
    operation_performed: Optional[str] = None # created, updated, deleted, queried, none

# ==========================================
# Manual CRUD & Update Schemas
# ==========================================

class MealLogUpdate(BaseModel):
    meal_type: Optional[str] = None
    meal_title: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    log_date: Optional[date] = None

class WorkoutLogUpdate(BaseModel):
    exercise_name: Optional[str] = None
    workout_category: Optional[str] = None
    duration_minutes: Optional[int] = None
    intensity: Optional[str] = None
    calories_burned: Optional[float] = None
    muscle_groups: Optional[str] = None
    notes: Optional[str] = None
    log_date: Optional[date] = None

class MealLogManualCreate(BaseModel):
    meal_type: str = "lunch"
    meal_title: str
    items: List[Dict[str, Any]] = []
    calories: float
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0
    fiber_g: float = 0.0
    log_date: Optional[date] = None

class WorkoutLogManualCreate(BaseModel):
    exercise_name: str
    workout_category: str = "strength"
    duration_minutes: int = 30
    intensity: str = "moderate"
    calories_burned: float
    muscle_groups: str = "Full Body"
    notes: Optional[str] = None
    log_date: Optional[date] = None

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
    tdee: float = 2000.0
    total_burn: float = 2000.0
    deficit: float = 0.0
    is_deficit: bool = False

class WeeklyTrendsResponse(BaseModel):
    calorie_target: int
    protein_target: float
    tdee_baseline: float = 2000.0
    bmr: float = 1600.0
    daily_data: List[DailyTrendPoint]
    weekly_avg_calories: float
    weekly_avg_protein: float
    weekly_total_burned: float
    weekly_net_deficit: float = 0.0
    projected_weight_change_kg: float = 0.0
    days_logged: int
