from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import UserProfile, UserMemory
from app.schemas.schemas import UserProfileSchema, UserMemoryResponse

router = APIRouter(prefix="/api/profile", tags=["User Profile"])

@router.get("", response_model=UserProfileSchema)
def get_profile(db: Session = Depends(get_db)):
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

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
    profile.dietary_preference = updated.dietary_preference
    profile.allergies = updated.allergies

    db.commit()
    db.refresh(profile)
    return profile

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
