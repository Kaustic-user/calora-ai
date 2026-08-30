import json
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.db.models import MealLog, WorkoutLog, UserProfile
from app.schemas.schemas import (
    MealLogResponse,
    WorkoutLogResponse,
    DailySummaryResponse,
    DailyTrendPoint, WeeklyTrendsResponse
)

router = APIRouter(prefix="/api/logs", tags=["Logs & Summary"])

@router.get("/daily-summary", response_model=DailySummaryResponse)
def get_daily_summary(
    target_date: Optional[date] = Query(None, description="Target summary date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    query_date = target_date if isinstance(target_date, date) else date.today()

    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)

    meals = db.query(MealLog).filter(MealLog.log_date == query_date).order_by(MealLog.created_at.desc()).all()
    workouts = db.query(WorkoutLog).filter(WorkoutLog.log_date == query_date).order_by(WorkoutLog.created_at.desc()).all()

    cal_consumed = sum(m.calories for m in meals)
    cal_burned = sum(w.calories_burned for w in workouts)
    protein_consumed = sum(m.protein_g for m in meals)
    carbs_consumed = sum(m.carbs_g for m in meals)
    fat_consumed = sum(m.fat_g for m in meals)
    fiber_consumed = sum(m.fiber_g for m in meals)

    meal_responses = []
    for m in meals:
        try:
            items = json.loads(m.items_json) if m.items_json else []
        except Exception:
            items = []
        try:
            assumptions = json.loads(m.assumptions_json) if m.assumptions_json else []
        except Exception:
            assumptions = []

        meal_responses.append(MealLogResponse(
            id=m.id,
            meal_type=m.meal_type,
            meal_title=m.meal_title,
            raw_transcript=m.raw_transcript,
            items=items,
            calories=m.calories,
            protein_g=m.protein_g,
            carbs_g=m.carbs_g,
            fat_g=m.fat_g,
            fiber_g=m.fiber_g,
            assumptions=assumptions,
            is_confirmed=m.is_confirmed,
            log_date=m.log_date,
            created_at=m.created_at
        ))

    workout_responses = [WorkoutLogResponse.model_validate(w) for w in workouts]

    return DailySummaryResponse(
        date=query_date,
        calorie_target=profile.calorie_target,
        calories_consumed=round(cal_consumed, 1),
        calories_burned=round(cal_burned, 1),
        net_calories=round(cal_consumed - cal_burned, 1),
        protein_target=profile.protein_target,
        protein_consumed=round(protein_consumed, 1),
        carbs_target=profile.carbs_target,
        carbs_consumed=round(carbs_consumed, 1),
        fat_target=profile.fat_target,
        fat_consumed=round(fat_consumed, 1),
        fiber_target=profile.fiber_target,
        fiber_consumed=round(fiber_consumed, 1),
        meals=meal_responses,
        workouts=workout_responses
    )

@router.get("/weekly-trends", response_model=WeeklyTrendsResponse)
def get_weekly_trends(db: Session = Depends(get_db)):
    """
    Computes real-time 7-day rolling trends across calorie intake, burn, and macronutrients.
    """
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)

    today = date.today()
    start_date = today - timedelta(days=6)

    # Query all meals and workouts in the last 7 days
    meals = db.query(MealLog).filter(MealLog.log_date >= start_date, MealLog.log_date <= today).all()
    workouts = db.query(WorkoutLog).filter(WorkoutLog.log_date >= start_date, WorkoutLog.log_date <= today).all()

    daily_points = []
    total_cals = 0.0
    total_protein = 0.0
    total_burned = 0.0
    days_logged_count = 0

    for i in range(6, -1, -1):
        cur_date = today - timedelta(days=i)
        day_label = "Today" if cur_date == today else cur_date.strftime("%a")

        day_meals = [m for m in meals if m.log_date == cur_date]
        day_workouts = [w for w in workouts if w.log_date == cur_date]

        day_cal = sum(m.calories for m in day_meals)
        day_prot = sum(m.protein_g for m in day_meals)
        day_carbs = sum(m.carbs_g for m in day_meals)
        day_fat = sum(m.fat_g for m in day_meals)
        day_burn = sum(w.calories_burned for w in day_workouts)

        if len(day_meals) > 0 or len(day_workouts) > 0:
            days_logged_count += 1

        total_cals += day_cal
        total_protein += day_prot
        total_burned += day_burn

        daily_points.append(DailyTrendPoint(
            date=cur_date,
            day=day_label,
            calories=round(day_cal, 1),
            protein=round(day_prot, 1),
            carbs=round(day_carbs, 1),
            fat=round(day_fat, 1),
            burned=round(day_burn, 1),
            net=round(day_cal - day_burn, 1)
        ))

    # Averages across the 7 days
    avg_divisor = 7
    avg_cals = round(total_cals / avg_divisor, 1)
    avg_prot = round(total_protein / avg_divisor, 1)

    return WeeklyTrendsResponse(
        calorie_target=profile.calorie_target,
        protein_target=profile.protein_target,
        daily_data=daily_points,
        weekly_avg_calories=avg_cals,
        weekly_avg_protein=avg_prot,
        weekly_total_burned=round(total_burned, 1),
        days_logged=days_logged_count
    )

@router.delete("/meals/{meal_id}")
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(MealLog).filter(MealLog.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    db.delete(meal)
    db.commit()
    return {"status": "deleted", "id": meal_id}

@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return {"status": "deleted", "id": workout_id}
