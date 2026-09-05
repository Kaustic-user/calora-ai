from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import UserProfile, UserMemory
from app.schemas.schemas import UserProfileSchema, UserMemoryResponse

router = APIRouter(prefix="/api/profile", tags=["User Profile"])

def compute_bmr_and_tdee(weight_kg: float, height_cm: float, age: int, gender: str, activity_level: str):
    wt = float(weight_kg or 70.0)
    ht = float(height_cm or 175.0)
    ag = int(age or 25)
    gen = (gender or "male").lower()

    if gen == "female":
        bmr = (10.0 * wt) + (6.25 * ht) - (5.0 * ag) - 161.0
    else:
        bmr = (10.0 * wt) + (6.25 * ht) - (5.0 * ag) + 5.0

    multipliers = {
        "sedentary": 1.200,
        "lightly_active": 1.375,
        "moderately_active": 1.550,
        "very_active": 1.725,
        "extra_active": 1.900
    }
    multiplier = multipliers.get((activity_level or "sedentary").lower(), 1.200)
    tdee = bmr * multiplier
    return round(bmr), round(tdee)

@router.get("", response_model=UserProfileSchema)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)

    bmr, tdee = compute_bmr_and_tdee(
        profile.weight_kg, profile.height_cm, profile.age, profile.gender, profile.activity_level
    )

    resp = UserProfileSchema.model_validate(profile)
    resp.bmr = bmr
    resp.tdee = tdee
    return resp

@router.put("", response_model=UserProfileSchema)
def update_profile(updated: UserProfileSchema, db: Session = Depends(get_db)):
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)

    profile.name = updated.name
    profile.calorie_target = updated.calorie_target
    profile.protein_target = updated.protein_target
    profile.carbs_target = updated.carbs_target
    profile.fat_target = updated.fat_target
    profile.fiber_target = updated.fiber_target
    profile.water_target_liters = updated.water_target_liters
    profile.weight_kg = updated.weight_kg
    if updated.height_cm is not None:
        profile.height_cm = updated.height_cm
    if updated.age is not None:
        profile.age = updated.age
    if updated.gender is not None:
        profile.gender = updated.gender
    if updated.activity_level is not None:
        profile.activity_level = updated.activity_level
    if updated.target_deficit_kcal is not None:
        profile.target_deficit_kcal = updated.target_deficit_kcal
    profile.dietary_preference = updated.dietary_preference
    profile.allergies = updated.allergies

    db.commit()
    db.refresh(profile)

    bmr, tdee = compute_bmr_and_tdee(
        profile.weight_kg, profile.height_cm, profile.age, profile.gender, profile.activity_level
    )

    resp = UserProfileSchema.model_validate(profile)
    resp.bmr = bmr
    resp.tdee = tdee
    return resp

@router.get("/memories", response_model=List[UserMemoryResponse])
def get_memories(db: Session = Depends(get_db)):
    memories = db.query(UserMemory).order_by(UserMemory.created_at.desc()).all()
    return memories

@router.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    mem = db.query(UserMemory).filter(UserMemory.id == memory_id).first()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(mem)
    db.commit()
    return {"status": "deleted", "id": memory_id}
