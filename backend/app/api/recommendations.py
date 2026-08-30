from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.db.models import MealLog, WorkoutLog, UserProfile
from app.agents.recommender_agent import recommender_agent
from app.agents.memory_agent import memory_agent
from app.schemas.schemas import MealRecommendationOption

router = APIRouter(prefix="/api/recommendations", tags=["Meal Recommendations"])

@router.get("/dinner", response_model=List[MealRecommendationOption])
def get_macro_recommendations(
    filter: Optional[str] = Query(None, description="Optional filter e.g. 'quick', 'high_protein', 'light'"),
    db: Session = Depends(get_db)
):
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)
        db.commit()

    today_meals = db.query(MealLog).filter(MealLog.log_date == date.today()).all()
    today_workouts = db.query(WorkoutLog).filter(WorkoutLog.log_date == date.today()).all()

    consumed_cals = sum(m.calories for m in today_meals)
    burned_cals = sum(w.calories_burned for w in today_workouts)
    consumed_protein = sum(m.protein_g for m in today_meals)
    consumed_carbs = sum(m.carbs_g for m in today_meals)
    consumed_fat = sum(m.fat_g for m in today_meals)

    # Net calorie remaining budget (grants back energy burned during workouts)
    net_consumed_cals = max(0.0, consumed_cals - burned_cals)
    rem_cals = max(150.0, profile.calorie_target - net_consumed_cals)
    rem_protein = max(15.0, profile.protein_target - consumed_protein)
    rem_carbs = max(15.0, profile.carbs_target - consumed_carbs)
    rem_fat = max(5.0, profile.fat_target - consumed_fat)

    meals_eaten_today = [m.meal_title for m in today_meals]
    user_memory = memory_agent.get_user_context(db)

    return recommender_agent.get_recommendations(
        remaining_calories=rem_cals,
        remaining_protein=rem_protein,
        remaining_carbs=rem_carbs,
        remaining_fat=rem_fat,
        dietary_preference=profile.dietary_preference,
        allergies=profile.allergies,
        meals_eaten_today=meals_eaten_today,
        user_memory=user_memory,
        custom_filter=filter
    )
