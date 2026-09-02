from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), default="Fitness Enthusiast")
    calorie_target = Column(Integer, default=2000)
    protein_target = Column(Float, default=120.0) # grams
    carbs_target = Column(Float, default=225.0)   # grams
    fat_target = Column(Float, default=65.0)      # grams
    fiber_target = Column(Float, default=30.0)    # grams
    water_target_liters = Column(Float, default=3.0)
    weight_kg = Column(Float, default=70.0)       # body weight in kg
    height_cm = Column(Float, default=175.0)      # height in cm
    age = Column(Integer, default=25)             # age in years
    gender = Column(String(20), default="male")   # male, female
    activity_level = Column(String(30), default="sedentary") # sedentary, lightly_active, moderately_active, very_active, extra_active
    target_deficit_kcal = Column(Integer, default=500) # target daily calorie deficit
    dietary_preference = Column(String(50), default="vegetarian") # vegetarian, eggetarian, non_vegetarian, vegan, jain
    allergies = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class MealLog(Base):
    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    meal_type = Column(String(50), default="lunch") # breakfast, lunch, dinner, snack
    meal_title = Column(String(200), nullable=False)
    raw_transcript = Column(Text, nullable=True)
    items_json = Column(Text, nullable=False) # JSON array of ingredient items & quantities
    calories = Column(Float, default=0.0)
    protein_g = Column(Float, default=0.0)
    carbs_g = Column(Float, default=0.0)
    fat_g = Column(Float, default=0.0)
    fiber_g = Column(Float, default=0.0)
    assumptions_json = Column(Text, default="[]") # Assumptions flagged by Clarification agent
    is_confirmed = Column(Boolean, default=True)
    log_date = Column(Date, default=date.today, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True, index=True)
    exercise_name = Column(String(150), nullable=False)
    workout_category = Column(String(50), default="strength") # cardio, strength, yoga, sports, hiit
    duration_minutes = Column(Integer, default=30)
    intensity = Column(String(30), default="moderate") # low, moderate, high
    calories_burned = Column(Float, default=0.0)
    muscle_groups = Column(String(150), default="Full Body")
    notes = Column(Text, nullable=True)
    log_date = Column(Date, default=date.today, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserMemory(Base):
    __tablename__ = "user_memory"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), index=True, default="habit") # habit, favorite_food, restriction, correction
    key = Column(String(100), index=True, nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
