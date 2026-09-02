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
    DailyTrendPoint, 
    WeeklyTrendsResponse,
    MealLogUpdate,
    WorkoutLogUpdate,
    MealLogManualCreate,
    WorkoutLogManualCreate
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
        calories_consumed=round(cal_consumed),
        calories_burned=round(cal_burned),
        net_calories=round(cal_consumed - cal_burned),
        protein_target=round(profile.protein_target),
        protein_consumed=round(protein_consumed),
        carbs_target=round(profile.carbs_target),
        carbs_consumed=round(carbs_consumed),
        fat_target=round(profile.fat_target),
        fat_consumed=round(fat_consumed),
        fiber_target=round(profile.fiber_target),
        fiber_consumed=round(fiber_consumed),
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

@router.post("/meals", response_model=MealLogResponse)
def create_manual_meal(payload: MealLogManualCreate, db: Session = Depends(get_db)):
    """Manually logs a meal directly for a specified log_date (defaulting to today)"""
    target_d = payload.log_date if payload.log_date else date.today()
    meal = MealLog(
        meal_type=payload.meal_type,
        meal_title=payload.meal_title,
        raw_transcript="Manually logged via dashboard",
        items_json=json.dumps(payload.items),
        calories=round(payload.calories, 1),
        protein_g=round(payload.protein_g, 1),
        carbs_g=round(payload.carbs_g, 1),
        fat_g=round(payload.fat_g, 1),
        fiber_g=round(payload.fiber_g, 1),
        assumptions_json="[]",
        is_confirmed=True,
        log_date=target_d
    )
    db.add(meal)
    db.commit()
    db.refresh(meal)

    return MealLogResponse(
        id=meal.id,
        meal_type=meal.meal_type,
        meal_title=meal.meal_title,
        raw_transcript=meal.raw_transcript,
        items=payload.items,
        calories=meal.calories,
        protein_g=meal.protein_g,
        carbs_g=meal.carbs_g,
        fat_g=meal.fat_g,
        fiber_g=meal.fiber_g,
        assumptions=[],
        is_confirmed=meal.is_confirmed,
        log_date=meal.log_date,
        created_at=meal.created_at
    )

@router.put("/meals/{meal_id}", response_model=MealLogResponse)
def update_meal(meal_id: int, payload: MealLogUpdate, db: Session = Depends(get_db)):
    """Updates an existing meal record with modified items, portions, macros, or log_date"""
    meal = db.query(MealLog).filter(MealLog.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    if payload.meal_type is not None:
        meal.meal_type = payload.meal_type
    if payload.meal_title is not None:
        meal.meal_title = payload.meal_title
    if payload.items is not None:
        meal.items_json = json.dumps(payload.items)
    if payload.calories is not None:
        meal.calories = round(payload.calories, 1)
    if payload.protein_g is not None:
        meal.protein_g = round(payload.protein_g, 1)
    if payload.carbs_g is not None:
        meal.carbs_g = round(payload.carbs_g, 1)
    if payload.fat_g is not None:
        meal.fat_g = round(payload.fat_g, 1)
    if payload.fiber_g is not None:
        meal.fiber_g = round(payload.fiber_g, 1)
    if payload.log_date is not None:
        meal.log_date = payload.log_date

    db.commit()
    db.refresh(meal)

    try:
        items = json.loads(meal.items_json) if meal.items_json else []
    except Exception:
        items = []
    try:
        assumptions = json.loads(meal.assumptions_json) if meal.assumptions_json else []
    except Exception:
        assumptions = []

    return MealLogResponse(
        id=meal.id,
        meal_type=meal.meal_type,
        meal_title=meal.meal_title,
        raw_transcript=meal.raw_transcript,
        items=items,
        calories=meal.calories,
        protein_g=meal.protein_g,
        carbs_g=meal.carbs_g,
        fat_g=meal.fat_g,
        fiber_g=meal.fiber_g,
        assumptions=assumptions,
        is_confirmed=meal.is_confirmed,
        log_date=meal.log_date,
        created_at=meal.created_at
    )

@router.delete("/meals/{meal_id}")
def delete_meal(meal_id: int, db: Session = Depends(get_db)):
    meal = db.query(MealLog).filter(MealLog.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    db.delete(meal)
    db.commit()
    return {"status": "deleted", "id": meal_id}

@router.post("/workouts", response_model=WorkoutLogResponse)
def create_manual_workout(payload: WorkoutLogManualCreate, db: Session = Depends(get_db)):
    """Manually logs a workout directly for a specified log_date (defaulting to today)"""
    target_d = payload.log_date if payload.log_date else date.today()
    workout = WorkoutLog(
        exercise_name=payload.exercise_name,
        workout_category=payload.workout_category,
        duration_minutes=payload.duration_minutes,
        intensity=payload.intensity,
        calories_burned=round(payload.calories_burned, 1),
        muscle_groups=payload.muscle_groups,
        notes=payload.notes or "Manually logged via dashboard",
        log_date=target_d
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return WorkoutLogResponse.model_validate(workout)

@router.put("/workouts/{workout_id}", response_model=WorkoutLogResponse)
def update_workout(workout_id: int, payload: WorkoutLogUpdate, db: Session = Depends(get_db)):
    """Updates an existing workout record with modified duration, intensity, burn, or log_date"""
    workout = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    if payload.exercise_name is not None:
        workout.exercise_name = payload.exercise_name
    if payload.workout_category is not None:
        workout.workout_category = payload.workout_category
    if payload.duration_minutes is not None:
        workout.duration_minutes = payload.duration_minutes
    if payload.intensity is not None:
        workout.intensity = payload.intensity
    if payload.calories_burned is not None:
        workout.calories_burned = round(payload.calories_burned, 1)
    if payload.muscle_groups is not None:
        workout.muscle_groups = payload.muscle_groups
    if payload.notes is not None:
        workout.notes = payload.notes
    if payload.log_date is not None:
        workout.log_date = payload.log_date

    db.commit()
    db.refresh(workout)
    return WorkoutLogResponse.model_validate(workout)

@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return {"status": "deleted", "id": workout_id}
