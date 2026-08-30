from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import UserMemory

class MemoryAgent:
    def get_user_context(self, db: Session) -> Dict[str, Any]:
        memories = db.query(UserMemory).all()
        context = {
            "favorites": [],
            "restrictions": [],
            "habits": []
        }
        for mem in memories:
            if mem.category in context:
                context[mem.category].append(f"{mem.key}: {mem.value}")
        return context

    def save_habit(self, db: Session, key: str, value: str, category: str = "habit"):
        existing = db.query(UserMemory).filter(UserMemory.key == key).first()
        if existing:
            existing.value = value
        else:
            new_mem = UserMemory(category=category, key=key, value=value)
            db.add(new_mem)
        db.commit()

memory_agent = MemoryAgent()
